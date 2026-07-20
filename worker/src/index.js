import { PROMPTS } from './prompts.js'
import { buildResultHtml, buildGrammarHtml, buildPhraseHtml, buildWordHtml } from './html.js'
import { putObjectToSpaces } from './spaces.js'
import { purgeCdnCache } from './doCdn.js'
import { buildRecallGamePrompt } from './recallGamePrompts.js'
import { buildTnpscPrompt } from './tnpscPrompts.js'
import { buildCaQuestionPrompt } from './caQuestionPrompts.js'
import { buildCaQbPrompt } from './caQbPrompts.js'

const HTML_BUILDERS = {
  spoken: buildResultHtml,
  grammer: buildGrammarHtml,
  phrase: buildPhraseHtml,
  word: buildWordHtml,
}

const ALLOWED_ORIGIN_DEFAULT = 'https://gowthamgsv32.github.io'

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || ALLOWED_ORIGIN_DEFAULT,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

// GEMINI_API_KEY may hold one key or a comma-separated list. Keeping the
// same variable name means adding more keys is just editing its value in
// the Cloudflare dashboard — no new variable to wire up.
function parseApiKeys(raw) {
  return (raw || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 2048,
  thinkingConfig: { thinkingBudget: 0 },
}

// Tries each key in order. A 429 (quota exceeded) moves on to the next key
// immediately since retrying the same key won't help. A 503 ("the model is
// currently experiencing high demand") is usually a transient overload on
// Google's side, so that key gets one quick retry before falling through to
// the next key. Any other response (success or a real error) is returned
// immediately.
async function callGeminiWithFallback(promptText, apiKeys, generationConfig = DEFAULT_GENERATION_CONFIG) {
  let lastError = null

  for (const apiKey of apiKeys) {
    const maxAttempts = 2

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig,
          }),
        }
      )

      if (res.status !== 429 && res.status !== 503) {
        return res
      }

      let detail = ''
      try {
        detail = (await res.json())?.error?.message || ''
      } catch {
        // ignore — fall back to the generic message below
      }
      lastError = new Error(
        detail ||
          (res.status === 429
            ? 'Rate limit exceeded for this Gemini API key.'
            : 'Gemini model is temporarily overloaded.')
      )

      if (res.status === 503 && attempt < maxAttempts) {
        await sleep(600)
        continue
      }

      break
    }
  }

  throw lastError || new Error('No Gemini API keys configured.')
}

async function handleGenerate(request, env) {
  const { prompt, day, valSelect } = await request.json()

  const promptBuilder = PROMPTS[valSelect]
  if (!promptBuilder) {
    return json(env, { error: `No prompt configured for "${valSelect}" yet.` }, 400)
  }

  const apiKeys = parseApiKeys(env.GEMINI_API_KEY)
  if (apiKeys.length === 0) {
    return json(env, { error: 'No Gemini API key configured.' }, 500)
  }

  let geminiRes
  try {
    geminiRes = await callGeminiWithFallback(promptBuilder(prompt, day), apiKeys)
  } catch (err) {
    return json(env, { error: `Gemini request failed on every API key: ${err.message}` }, 503)
  }

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  const finishReason = geminiBody.candidates?.[0]?.finishReason
  let rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    if (finishReason === 'MAX_TOKENS') {
      return json(env, { error: 'Gemini response was cut off (ran out of output tokens) before finishing the JSON. Try again.' }, 502)
    }
    return json(env, { error: `Failed to parse AI response: ${rawText}` }, 502)
  }

  // The day number is always ours, never trust the model to echo it back correctly.
  const html = HTML_BUILDERS[valSelect]({ ...data, day })

  return json(env, { html, json: data })
}

// Recall Game Parser: turns one selected Current Affairs article into short
// recall content. Unlike handleGenerate, the result is returned as raw JSON
// (question/hint/exp) — the frontend assembles the final {id, ver, date,
// is_lg, con} shape itself, once per selected article.
async function handleGenerateRecall(request, env) {
  const { article } = await request.json()

  if (!article?.title_en) {
    return json(env, { error: 'Missing article data.' }, 400)
  }

  const apiKeys = parseApiKeys(env.GEMINI_API_KEY)
  if (apiKeys.length === 0) {
    return json(env, { error: 'No Gemini API key configured.' }, 500)
  }

  let geminiRes
  try {
    geminiRes = await callGeminiWithFallback(buildRecallGamePrompt(article), apiKeys)
  } catch (err) {
    return json(env, { error: `Gemini request failed on every API key: ${err.message}` }, 503)
  }

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  const finishReason = geminiBody.candidates?.[0]?.finishReason
  let rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    if (finishReason === 'MAX_TOKENS') {
      return json(env, { error: 'Gemini response was cut off (ran out of output tokens) before finishing the JSON. Try again.' }, 502)
    }
    return json(env, { error: `Failed to parse AI response: ${rawText}` }, 502)
  }

  return json(env, { data })
}

const TNPSC_GENERATION_CONFIG = {
  temperature: 0.15,
  maxOutputTokens: 65536,
  thinkingConfig: { thinkingBudget: 0 },
}

// TNPSC Parser: turns one page-batch of PDF text into a large compound
// response ("=== FILE 1: ... === === FILE 2: ... ===") rather than a single
// JSON object. Splitting/parsing/retry-on-broken-JSON logic lives entirely
// in the frontend (mirroring the desktop app's _split_and_save), so this
// just proxies the raw model text back — no JSON.parse attempted here.
async function handleGenerateTnpsc(request, env) {
  const { params, pdfText } = await request.json()

  if (!params?.subjectCode || !pdfText) {
    return json(env, { error: 'Missing params or PDF text.' }, 400)
  }

  const apiKeys = parseApiKeys(env.GEMINI_API_KEY)
  if (apiKeys.length === 0) {
    return json(env, { error: 'No Gemini API key configured.' }, 500)
  }

  const prompt = buildTnpscPrompt(params, pdfText)

  let geminiRes
  try {
    geminiRes = await callGeminiWithFallback(prompt, apiKeys, TNPSC_GENERATION_CONFIG)
  } catch (err) {
    return json(env, { error: `Gemini request failed on every API key: ${err.message}` }, 503)
  }

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  const finishReason = geminiBody.candidates?.[0]?.finishReason
  const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!rawText) {
    return json(env, { error: `Gemini returned no text (finishReason: ${finishReason || 'unknown'}).` }, 502)
  }

  return json(env, { text: rawText, finishReason })
}

const CA_QUESTIONS_GENERATION_CONFIG = {
  temperature: 0.3,
  maxOutputTokens: 16384,
  thinkingConfig: { thinkingBudget: 0 },
}

// CA Parser: turns a day's cas entries into 2 TNPSC-style MCQ objects each.
// qid is assigned by the frontend from its own running sequence, so this
// just returns the parsed JSON array of question objects.
async function handleGenerateCaQuestions(request, env) {
  const { cas } = await request.json()

  if (!Array.isArray(cas) || cas.length === 0) {
    return json(env, { error: 'Missing cas articles.' }, 400)
  }

  const apiKeys = parseApiKeys(env.GEMINI_API_KEY)
  if (apiKeys.length === 0) {
    return json(env, { error: 'No Gemini API key configured.' }, 500)
  }

  let geminiRes
  try {
    geminiRes = await callGeminiWithFallback(buildCaQuestionPrompt(cas), apiKeys, CA_QUESTIONS_GENERATION_CONFIG)
  } catch (err) {
    return json(env, { error: `Gemini request failed on every API key: ${err.message}` }, 503)
  }

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  const finishReason = geminiBody.candidates?.[0]?.finishReason
  let rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    if (finishReason === 'MAX_TOKENS') {
      return json(env, { error: 'Gemini response was cut off (ran out of output tokens) before finishing the JSON. Try again.' }, 502)
    }
    return json(env, { error: `Failed to parse AI response: ${rawText}` }, 502)
  }

  if (!Array.isArray(data)) {
    return json(env, { error: 'Gemini did not return a JSON array.' }, 502)
  }

  return json(env, { data })
}

// CA Parser: lists a Google Sheet's tabs (name + gid) via the Sheets API, so
// the frontend can offer a dropdown instead of a hand-typed tab name/gid.
// Requires only an API key (no OAuth) since the sheet is shared publicly —
// the key just identifies the calling project for quota purposes.
async function handleGetSheetTabs(request, env) {
  const { sheetId } = await request.json()

  if (!sheetId) {
    return json(env, { error: 'Missing sheetId.' }, 400)
  }

  const apiKey = env.GOOGLE_SHEETS_API_KEY
  if (!apiKey) {
    return json(env, { error: 'No Google Sheets API key configured (GOOGLE_SHEETS_API_KEY).' }, 500)
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`
  const res = await fetch(url)
  const body = await res.json()

  if (!res.ok) {
    return json(env, { error: body.error?.message || `Sheets API request failed (${res.status})` }, res.status)
  }

  const tabs = (body.sheets || [])
    .map((s) => ({ name: s.properties.title, gid: String(s.properties.sheetId), index: s.properties.index }))
    .sort((a, b) => a.index - b.index)

  return json(env, { tabs })
}

const CA_QB_GENERATION_CONFIG = {
  temperature: 0.4,
  maxOutputTokens: 8192,
  thinkingConfig: { thinkingBudget: 0 },
}

// CA QB Parser: turns one article's { topic, text } into a full question
// bank batch (>= 2 questions, all 4 exam types). qid is assigned by the
// frontend, so this just returns the parsed JSON array.
async function handleGenerateCaQb(request, env) {
  const { topic, text } = await request.json()

  if (!topic || !text) {
    return json(env, { error: 'Missing topic or text.' }, 400)
  }

  const apiKeys = parseApiKeys(env.GEMINI_API_KEY)
  if (apiKeys.length === 0) {
    return json(env, { error: 'No Gemini API key configured.' }, 500)
  }

  let geminiRes
  try {
    geminiRes = await callGeminiWithFallback(buildCaQbPrompt({ topic, text }), apiKeys, CA_QB_GENERATION_CONFIG)
  } catch (err) {
    return json(env, { error: `Gemini request failed on every API key: ${err.message}` }, 503)
  }

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  const finishReason = geminiBody.candidates?.[0]?.finishReason
  let rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    if (finishReason === 'MAX_TOKENS') {
      return json(env, { error: 'Gemini response was cut off (ran out of output tokens) before finishing the JSON. Try again.' }, 502)
    }
    return json(env, { error: `Failed to parse AI response: ${rawText}` }, 502)
  }

  if (!Array.isArray(data) || data.length < 2) {
    return json(
      env,
      { error: `Expected at least 2 questions, got ${Array.isArray(data) ? data.length : 'an invalid response'}.` },
      502
    )
  }

  return json(env, { data })
}

async function handleUpload(request, env) {
  const { date, json: jsonPayload } = await request.json()

  const dateParts = date.split('-')
  if (dateParts.length !== 3) {
    return json(env, { success: false, error: 'Invalid date' }, 400)
  }
  const [year, month, day] = dateParts
  const fileName = `${day}-${month}-${year}.json`

  try {
    await putObjectToSpaces({
      accessKey: env.DO_SPACES_KEY,
      secretKey: env.DO_SPACES_SECRET,
      key: `Daily_Bytes/utils/${fileName}`,
      body: JSON.stringify(jsonPayload),
    })
    return json(env, { success: true, file: fileName })
  } catch (err) {
    return json(env, { success: false, error: err.message }, 500)
  }
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Generic batch file upload used by the Daily Bytes publish flow (day json,
// month json, root json, ver json, month zip). Business logic (merging,
// versioning) lives entirely in the frontend — this just signs and writes
// whatever files it's given.
async function handlePublish(request, env) {
  const { files } = await request.json()

  const results = []
  for (const file of files) {
    try {
      const body = file.bodyBase64 ? base64ToBytes(file.bodyBase64) : file.body
      await putObjectToSpaces({
        accessKey: env.DO_SPACES_KEY,
        secretKey: env.DO_SPACES_SECRET,
        key: file.key,
        body,
        contentType: file.contentType || 'application/json',
      })
      results.push({ key: file.key, success: true })
    } catch (err) {
      results.push({ key: file.key, success: false, error: err.message })
    }
  }

  return json(env, { results })
}

// Purges specific object keys (or ["*"] for everything) from the DO Spaces
// CDN edge cache — needed after a publish, since the CDN otherwise keeps
// serving whatever it cached until each file's TTL naturally expires.
async function handlePurgeCdn(request, env) {
  const { files } = await request.json()

  if (!env.DO_API_TOKEN) {
    return json(env, { error: 'No DigitalOcean API token configured (DO_API_TOKEN).' }, 500)
  }
  if (!Array.isArray(files) || files.length === 0) {
    return json(env, { error: 'Missing files to purge.' }, 400)
  }

  try {
    await purgeCdnCache(env.DO_API_TOKEN, files)
    return json(env, { success: true, files })
  } catch (err) {
    return json(env, { success: false, error: err.message }, 502)
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    const url = new URL(request.url)

    try {
      if (request.method === 'POST' && url.pathname === '/generate') {
        return await handleGenerate(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/generate-recall') {
        return await handleGenerateRecall(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/generate-tnpsc') {
        return await handleGenerateTnpsc(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/generate-ca-questions') {
        return await handleGenerateCaQuestions(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/generate-ca-qb') {
        return await handleGenerateCaQb(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/ca-sheet-tabs') {
        return await handleGetSheetTabs(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/upload') {
        return await handleUpload(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/publish') {
        return await handlePublish(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/purge-cdn') {
        return await handlePurgeCdn(request, env)
      }
      return json(env, { error: 'Not found' }, 404)
    } catch (err) {
      return json(env, { error: err.message }, 500)
    }
  },
}
