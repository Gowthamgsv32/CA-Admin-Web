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

  grammer: (topic, day) => `You are an expert English grammar coach who creates clear, practical, and engaging daily grammar lessons for learners at all levels.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Grammar Bytes card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "title": "<clear grammar topic title>",
  "subtitle": "<one-line description of what the learner will gain>",
  "level": "<one of: Beginner | Elementary | Intermediate | Upper-Intermediate | Advanced | Strategic Mastery>",
  "concept": "<2-3 sentence explanation of the grammar concept in simple, friendly language>",
  "golden_rule_intro": "<one short line introducing the examples, e.g. 'Use past perfect to show sequence:'>",
  "correct_examples": [
    "<correct example sentence 1 starting with ✅>",
    "<correct example sentence 2 starting with ✅>",
    "<correct example sentence 3 starting with ✅>",
    "<correct example sentence 4 starting with ✅>"
  ],
  "key_principles": [
    "<short principle sentence 1>",
    "<short principle sentence 2>",
    "<short principle sentence 3>"
  ],
  "tip_main": "<one powerful insight about this grammar rule>",
  "tip_checklist": [
    "<checklist item 1>",
    "<checklist item 2>",
    "<checklist item 3>"
  ],
  "footer": "<short motivational closing line with 1-2 relevant emojis at the end>"
}

Rules:
- correct_examples must be natural, realistic English sentences relevant to the topic
- key_principles must be short punchy sentences (max 8 words each)
- tip_checklist items must start with a action verb (e.g. 'Identify', 'Check', 'Avoid')
- level must reflect the complexity of the topic
- Return ONLY the JSON object, nothing else`,

  phrase: (topic, day) => `You are an expert English trainer who creates short "Learn by Exam" multiple-choice quiz cards to teach phrasal verbs, idioms, and phrases through interactive questions.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Phrase quiz card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "topic": "<short topic label, e.g. Phrasal Verbs>",
  "questions": [
    {
      "question": "<question text, e.g. What does the phrasal verb \\"X\\" mean?>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3, index of the correct option>,
      "explanation_title": "<short heading, e.g. Phrasal Verb: Get along>",
      "explanation_text": "<1-2 sentence explanation of the meaning and typical usage>",
      "explanation_example": "<one natural example sentence using it correctly>",
      "explanation_shortcut": "<short memorable one-line takeaway>"
    }
  ]
}

Rules:
- Generate exactly 2 questions for this topic: one testing meaning/recognition, one testing correct usage in a sentence.
- Exactly one option per question must be correct; the other three must be plausible but clearly wrong.
- Keep each option under 12 words.
- Return ONLY the JSON object, nothing else.`,

  word: null,
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

function buildGrammarHtml({
  day,
  title,
  subtitle,
  level,
  concept,
  golden_rule_intro,
  correct_examples,
  key_principles,
  tip_main,
  tip_checklist,
  footer,
}) {
  const examplesHtml = (correct_examples || []).map((ex) => `<div class="ex">${escapeHtml(ex)}</div>`).join('')
  const principlesHtml = (key_principles || []).map((p) => `<div class="ex">${escapeHtml(p)}</div>`).join('')
  const checklistHtml = (tip_checklist || []).map((item) => `✔ ${escapeHtml(item)}`).join('<br>\n')

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Daily Grammar – Day ${escapeHtml(day)}</title>
<style>
:root{
  --bg:#f5f5f7;
  --page:#ffffff;
  --fg:#111827;
  --muted:#6b7280;
  --border:#e5e7eb;
  --card-soft:#f9fafb;
  --accent:#2563eb;
  --tip-bg:#e9fce9;
  --example-bg:#f3f4f6;
}
*{ box-sizing:border-box; }
html,body{
  margin:0; padding:0;
  background:var(--bg); color:var(--fg);
  font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
}
.page{ max-width:640px; margin:0 auto; padding:16px 12px 24px; }
.page-inner{
  background:var(--page); border-radius:18px; padding:16px 14px 18px;
  box-shadow:0 8px 18px rgba(15,23,42,0.08);
}
.top-meta{ font-size:0.78rem; color:var(--muted); margin-bottom:4px; }
h1{ font-size:1.35rem; margin:0; }
.subtitle{ font-size:0.8rem; color:var(--muted); margin-bottom:10px; }
.level-pill{
  display:inline-block; padding:3px 9px; border-radius:999px;
  font-size:0.72rem; background:rgba(37,99,235,0.15); color:var(--accent);
  font-weight:600; margin-top:4px;
}
.section-card{
  background:var(--card-soft); border-radius:14px; border:1px solid var(--border);
  padding:10px; margin-top:12px;
}
.section-header{ font-weight:600; margin-bottom:6px; font-size:0.92rem; }
.examples{ margin-top:8px; display:grid; gap:6px; }
.ex{
  background:var(--example-bg); border-radius:10px; padding:8px 10px;
  font-size:0.86rem; border:1px solid rgba(148,163,184,0.35);
}
.tip-card{
  background:var(--tip-bg); border-radius:14px; padding:10px; margin-top:12px;
  border:1px solid rgba(34,197,94,0.2); font-size:0.9rem;
}
.bottom-meta{ font-size:0.78rem; color:var(--muted); margin-top:12px; }
</style>
</head>
<body>
<div class="page">
<div class="page-inner">

<div class="top-meta">Day ${escapeHtml(day)} • Daily Grammar Bytes</div>

<h1>${escapeHtml(title)}</h1>
<div class="subtitle">${escapeHtml(subtitle)}</div>
<div class="level-pill">${escapeHtml(level)}</div>

<section class="section-card">
  <div class="section-header">✨ Concept</div>
  <div>${escapeHtml(concept)}</div>
</section>

<section class="section-card">
  <div class="section-header">📏 Golden Rule</div>
  <div>${escapeHtml(golden_rule_intro)}</div>
  <div class="examples">${examplesHtml}</div>
  <div class="examples">${principlesHtml}</div>
</section>

<section class="tip-card">
  💡 ${escapeHtml(tip_main)}<br><br>
  ${checklistHtml}
</section>

<div class="bottom-meta">${escapeHtml(footer)}</div>

</div>
</div>
</body>
</html>`
}

function buildPhraseHtml({ day, topic, questions }) {
  const list = questions || []

  const questionsHtml = list
    .map((q, i) => {
      const optionsHtml = (q.options || [])
        .map(
          (opt, j) =>
            `<div class="option" data-correct="${j === q.correct_index}">${String.fromCharCode(65 + j)}) ${escapeHtml(opt)}</div>`
        )
        .join('\n')

      const divider = i < list.length - 1 ? '<hr style="margin:24px 0;border:none;border-top:1px dashed #ccc;">' : ''

      return `
<div class="question">${escapeHtml(q.question)}</div>

<div class="options">
${optionsHtml}
</div>

<div id="result${i + 1}" class="result"></div>

<div id="explanation${i + 1}" class="explanation">
💡 <strong>${escapeHtml(q.explanation_title)}</strong><br>
${escapeHtml(q.explanation_text)}<br>
<strong>Example:</strong> ${escapeHtml(q.explanation_example)}<br><br>
<strong>Shortcut:</strong> ${escapeHtml(q.explanation_shortcut)}
</div>
${divider}`
    })
    .join('\n')

  const setsJs = list
    .map(
      (_, i) =>
        `{ options: document.querySelectorAll('.options')[${i}].children, result: 'result${i + 1}', explanation: 'explanation${i + 1}' }`
    )
    .join(',\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Learn by Exam – Day ${escapeHtml(day)} (${escapeHtml(topic)})</title>

<style>

body{
    font-family:"Segoe UI",Arial,sans-serif;
    background:#f8f9fa;
    margin:0;
    padding:20px;
    color:#222;
    line-height:1.6;
}

.container{
    max-width:600px;
    margin:auto;
    background:#fff;
    border-radius:10px;
    padding:2px 24px 24px;
    box-shadow:0 4px 12px rgba(0,0,0,.1);
}

h2{
    text-align:center;
    color:#333;
}

.question{
    background:#eef6ff;
    border-left:4px solid #007bff;
    padding:12px;
    border-radius:6px;
    font-weight:600;
    margin-top:18px;
}

.options{
    margin:12px 0;
}

.option{
    background:#f2f2f2;
    padding:10px 12px;
    border-radius:6px;
    margin:8px 0;
    cursor:pointer;
    transition:background .2s;
}

.option:hover{
    background:#e6f0ff;
}

.option.correct{
    background:#e6ffee;
    border-left:4px solid #28a745;
    color:#28a745;
    font-weight:bold;
}

.option.wrong{
    background:#ffeaea;
    border-left:4px solid #dc3545;
    color:#dc3545;
    font-weight:bold;
}

.result{
    display:none;
    margin-top:10px;
    padding:12px;
    border-radius:6px;
    font-weight:bold;
}

.result.correct{
    background:#e6ffee;
    border-left:4px solid #28a745;
    color:#28a745;
}

.result.wrong{
    background:#ffeaea;
    border-left:4px solid #dc3545;
    color:#dc3545;
}

.explanation{
    display:none;
    background:#fffbea;
    border-left:4px solid #ffcc00;
    padding:12px;
    border-radius:6px;
    margin-top:16px;
}

</style>
</head>

<body>

<div class="container">

<h2>🧠 Day ${escapeHtml(day)} – Learn by Exam: ${escapeHtml(topic)}</h2>
${questionsHtml}
</div>

<script>

const sets = [
${setsJs}
];

sets.forEach(set => {

let answered = false;

[...set.options].forEach(option => {

option.addEventListener('click', () => {

if(answered) return;

answered = true;

const result = document.getElementById(set.result);
const explanation = document.getElementById(set.explanation);

if(option.dataset.correct === "true"){

option.classList.add("correct");
result.className="result correct";
result.innerHTML="🎉 Correct!";

}else{

option.classList.add("wrong");
result.className="result wrong";
result.innerHTML="❌ Wrong! Check the correct answer below.";

[...set.options]
.find(o=>o.dataset.correct==="true")
.classList.add("correct");

}

result.style.display="block";
explanation.style.display="block";

});

});

});

</script>

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

async function putObjectToSpaces({ accessKey, secretKey, key, body, contentType = 'application/json' }) {
  const path = `/${SPACES_BUCKET}/${key}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256Hex(body)

  const canonicalHeaders =
    `content-type:${contentType}\n` +
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
      'Content-Type': contentType,
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
const HTML_BUILDERS = {
  spoken: buildResultHtml,
  grammer: buildGrammarHtml,
  phrase: buildPhraseHtml,
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

async function handleGenerate(request, env) {
  const { prompt, day, valSelect } = await request.json()

  const promptBuilder = PROMPTS[valSelect]
  if (!promptBuilder) {
    return json(env, { error: `No prompt configured for "${valSelect}" yet.` }, 400)
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptBuilder(prompt, day) }] }],
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
