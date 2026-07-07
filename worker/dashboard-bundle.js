// Bundled single-file version of worker/src/*.js for pasting into the
// Cloudflare dashboard's Quick Edit code editor. Keep this in sync with
// the source files manually if you edit the split-file version instead.

// ---- prompts.js ----
const PROMPTS = {
  spoken: (topic) => `You are an expert English language coach specializing in spoken English tips for everyday learners.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Spoken English tip card for the following topic: "${topic}"

Return a JSON object with exactly these fields:
{
  "total": 365,
  "category": "<relevant category>",
  "title": "<title starting with an action verb>",
  "phrase": "<the main English phrase>",
  "tip": "<1-2 sentence explanation>",
  "examples": ["<example 1>", "<example 2>", "<example 3>", "<example 4>"],
  "pro_tip": "<advanced usage advice>",
  "goal": "<practical daily challenge>"
}

Return ONLY the JSON object, nothing else.`,
  grammer: null,
  word: null,
  phrase: null,
}

// ---- html.js ----
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildResultHtml({ day, total, category, title, tip, examples, pro_tip, goal }) {
  const examplesHtml = (examples || []).map((example) => `<li>${escapeHtml(example)}</li>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Daily Spoken English — Day ${escapeHtml(day)}</title>
  <style>
    body { background: #f4f7fb; margin: 0; font-family: "Inter", sans-serif; color: #1e1e1e; }
    .container { max-width: 780px; margin: 26px auto; padding: 16px; }
    .card { background: white; border-radius: 14px; padding: 22px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
    .top-label, .sub-label { font-size: 12px; color: #7b8593; margin-bottom: 4px; }
    h1 { font-size: 22px; margin: 0 0 12px 0; color: #005bb5; font-weight: 700; }
    .tip { font-size: 15px; margin: 10px 0 14px 0; }
    .examples { background: #fff; border-left: 4px solid #ffd770; padding: 12px 14px; border-radius: 8px; margin: 12px 0 18px 0; }
    .examples ul { margin: 6px 0 0 18px; }
    .pro-tip, .goal { background: #e8f1ff; padding: 12px 14px; border-radius: 8px; margin: 10px 0; font-size: 15px; }
  </style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="top-label">Tip ${escapeHtml(day)} of ${escapeHtml(total)} &bull; Daily Spoken English</div>
    <div class="sub-label">Day ${escapeHtml(day)} &bull; ${escapeHtml(category)}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="tip">&#128216; <b>Tip:</b> ${escapeHtml(tip)}</div>
    <div class="examples">&#128172; <b>Examples:</b><ul>${examplesHtml}</ul></div>
    <div class="pro-tip">&#129504; <b>Pro Tip:</b> ${escapeHtml(pro_tip)}</div>
    <div class="goal">&#127919; <b>Goal:</b> ${escapeHtml(goal)}</div>
  </div>
</div>
</body>
</html>`
}

// ---- spaces.js ----
const SPACES_REGION = 'ams3'
const SPACES_HOST = 'ams3.digitaloceanspaces.com'
const SPACES_BUCKET = 'healthappobjects'
const SPACES_SERVICE = 's3'

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sha256Hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return toHex(hash)
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function putObjectToSpaces({ accessKey, secretKey, key, body }) {
  const path = `/${SPACES_BUCKET}/${key}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256Hex(body)

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${SPACES_HOST}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')

  const credentialScope = `${dateStamp}/${SPACES_REGION}/${SPACES_SERVICE}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = await hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = await hmac(kDate, SPACES_REGION)
  const kService = await hmac(kRegion, SPACES_SERVICE)
  const kSigning = await hmac(kService, 'aws4_request')
  const signature = toHex(await hmac(kSigning, stringToSign))

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${SPACES_HOST}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
      Authorization: authorization,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spaces upload failed (${res.status}): ${text}`)
  }
}

// ---- index.js ----
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

async function handleGenerate(request, env) {
  const { prompt, day, valSelect } = await request.json()

  const promptBuilder = PROMPTS[valSelect]
  if (!promptBuilder) {
    return json(env, { error: `No prompt configured for "${valSelect}" yet.` }, 400)
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptBuilder(prompt) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    }
  )

  const geminiBody = await geminiRes.json()
  if (geminiBody.error) {
    return json(env, { error: geminiBody.error.message }, 502)
  }

  let rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    return json(env, { error: `Failed to parse AI response: ${rawText}` }, 502)
  }

  const html = buildResultHtml({ day, ...data })

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
      return json(env, { error: 'Not found' }, 404)
    } catch (err) {
      return json(env, { error: err.message }, 500)
    }
  },
}
