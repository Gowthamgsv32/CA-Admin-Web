import { PROMPTS } from './prompts.js'
import { buildResultHtml, buildGrammarHtml, buildPhraseHtml, buildWordHtml } from './html.js'
import { putObjectToSpaces } from './spaces.js'

const HTML_BUILDERS = {
  spoken: buildResultHtml,
  grammer: buildGrammarHtml,
  phrase: buildPhraseHtml,
  word: buildWordHtml,
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
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

// Tries each key in order, moving on to the next only when the current one
// is rate-limited (HTTP 429). Any other response (success or a real error)
// is returned immediately.
async function callGeminiWithFallback(promptText, apiKeys) {
  let lastError = null

  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (res.status !== 429) {
      return res
    }

    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {
      // ignore — fall back to the generic message below
    }
    lastError = new Error(detail || 'Rate limit exceeded for this Gemini API key.')
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
    return json(env, { error: `All Gemini API keys are rate-limited: ${err.message}` }, 429)
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
      if (request.method === 'POST' && url.pathname === '/upload') {
        return await handleUpload(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/publish') {
        return await handlePublish(request, env)
      }
      return json(env, { error: 'Not found' }, 404)
    } catch (err) {
      return json(env, { error: err.message }, 500)
    }
  },
}
