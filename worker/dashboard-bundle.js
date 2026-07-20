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

  word: (topic, day) => `You are an expert business communication coach who creates short professional-language upgrade quizzes to help learners speak and write with more polish and credibility at work.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Word quiz card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "phase": "<phase/theme label this topic belongs to, e.g. 'Phase 18 – Advanced Persuasion & Influence'>",
  "title": "<short title matching the topic, e.g. 'Influence Without Authority'>",
  "scenario": "<1-2 sentence realistic workplace scenario that sets up why this topic matters>",
  "questions": [
    {
      "prompt_phrase": "<a casual or vague phrase/idea related to the topic, to be upgraded>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3, index of the most professional/appropriate option>,
      "explanation": "<1 sentence explaining why the correct option is the strongest professional phrasing>"
    }
  ]
}

Rules:
- Generate exactly 2 questions for this topic.
- Each question's correct option must be the clearest, most professional, most credible phrasing; the other three must be plausible but weaker, vague, or unprofessional.
- Keep each option under 10 words.
- Return ONLY the JSON object, nothing else.`,
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

function buildWordHtml({ day, phase, title, scenario, questions }) {
  const list = questions || []

  const questionsHtml = list
    .map((q, i) => {
      const idx = i + 1
      const options = q.options || []
      const optionsHtml = options
        .map((opt, j) => {
          const letter = String.fromCharCode(65 + j)
          const isCorrect = j === q.correct_index
          return `<div class="option" onclick="check(this,${isCorrect},${idx})">${letter}) ${escapeHtml(opt)}</div>`
        })
        .join('\n')

      return `
<div class="q-block">
<div class="question">
What is the best professional way to say:<br>
“${escapeHtml(q.prompt_phrase)}”?
</div>

${optionsHtml}

<div id="exp${idx}" class="explanation">
✔ <b>${escapeHtml(options[q.correct_index] ?? '')}</b> = ${escapeHtml(q.explanation)}
</div>
</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Day ${escapeHtml(day)} – ${escapeHtml(title)}</title>

<style>

body{
font-family:"Segoe UI",Arial,sans-serif;
background:#f4f6f9;
margin:0;
padding:20px;
}

.container{
max-width:760px;
margin:auto;
background:white;
padding:24px;
border-radius:14px;
box-shadow:0 4px 18px rgba(0,0,0,0.12);
}

h2{
text-align:center;
}

.phase{
background:#eef6ff;
border-left:5px solid #007bff;
padding:12px;
border-radius:6px;
margin-bottom:20px;
text-align:center;
font-weight:600;
}

.scenario{
background:#fff3cd;
border-left:4px solid #ffc107;
padding:14px;
border-radius:6px;
margin-bottom:20px;
}

.question{
font-weight:600;
margin-top:18px;
}

.option{
background:#f2f2f2;
padding:11px;
margin:8px 0;
border-radius:6px;
cursor:pointer;
}

.option.correct{
background:#d4edda;
color:#155724;
}

.option.wrong{
background:#f8d7da;
color:#721c24;
}

.explanation{
display:none;
background:#e9f7ef;
border-left:4px solid #28a745;
padding:12px;
margin-top:10px;
border-radius:6px;
}

</style>
</head>

<body>

<div class="container">

<h2>🌟 Day ${escapeHtml(day)} – ${escapeHtml(title)}</h2>

<div class="phase">
${escapeHtml(phase)}
</div>

<div class="scenario">
${escapeHtml(scenario)}
</div>
${questionsHtml}
</div>

<script>

function check(el,isCorrect,id){

let options = el.parentNode.querySelectorAll(".option");

options.forEach(o=>{
o.style.pointerEvents="none";
});

if(isCorrect){
el.classList.add("correct");
}else{
el.classList.add("wrong");
}

document.getElementById("exp"+id).style.display="block";

}

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

async function putObjectToSpaces({
  accessKey,
  secretKey,
  key,
  body,
  contentType = 'application/json',
  acl = 'public-read',
}) {
  const path = `/${SPACES_BUCKET}/${key}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256Hex(body)

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${SPACES_HOST}\n` +
    `x-amz-acl:${acl}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date'

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
      'X-Amz-ACL': acl,
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

// ---- doCdn.js ----
// DigitalOcean CDN cache purging for the Spaces bucket. Uses the account's
// Personal Access Token — a different credential than the Spaces
// access/secret key pair used for S3-style uploads, since cache purging is
// a DigitalOcean-account-level API rather than part of the S3-compatible
// surface spaces.js talks to.
const DO_API_BASE = 'https://api.digitalocean.com/v2'
const SPACES_ORIGIN = 'healthappobjects.ams3.digitaloceanspaces.com'

async function findCdnEndpointId(apiToken) {
  const res = await fetch(`${DO_API_BASE}/cdn/endpoints`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.message || `Failed to list CDN endpoints (${res.status})`)
  }

  const endpoint = (body.endpoints || []).find((e) => e.origin === SPACES_ORIGIN)
  if (!endpoint) {
    throw new Error(`No CDN endpoint found for origin "${SPACES_ORIGIN}".`)
  }
  return endpoint.id
}

// files: object keys as already used for upload (e.g. "CurrentAffairs/root.json"),
// or ["*"] to purge everything under this CDN endpoint.
async function purgeCdnCache(apiToken, files) {
  const endpointId = await findCdnEndpointId(apiToken)

  const res = await fetch(`${DO_API_BASE}/cdn/endpoints/${endpointId}/cache`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `CDN purge failed (${res.status})`)
  }
}

// ---- recallGamePrompts.js ----
// Turns one selected Current Affairs article into short "recall game" content
// for competitive exam aspirants (TNPSC, SSC, etc). Called as (article) where
// article = { title_en, desc_en, category, date }.
function buildRecallGamePrompt(article) {
  return `You are an expert content creator for a competitive exam "Recall Game" app used by TNPSC, SSC, and other Indian competitive exam aspirants.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Source current affairs article:
Category: ${article.category || 'General'}
Date: ${article.date || ''}
Title: ${article.title_en}
Details: ${article.desc_en || ''}

Task:
Turn this article into short, punchy "recall" content. Analyse the topic in the context of related developments over the past 6 months (same sport/scheme/person/organisation) and connect it to relevant static GK (capitals, historic facts, notable records) wherever useful — this is exactly the current-affairs + static-GK blend these exams test.

Keep every piece of writing SHORT AND PUNCHY — no long paragraphs.

Return a JSON object with exactly these fields:
{
  "question": "<a punchy headline-style title for this recall card, under 15 words>",
  "hint": [
    "<hint 1 - a short teaser clue, under 8 words>",
    "<hint 2 - a short teaser clue, under 8 words>",
    "<hint 3 - a short teaser clue, under 8 words>"
  ],
  "exp": [
    {
      "title": "<short catchy heading for the main fact, under 10 words>",
      "sub_title": "<one supporting line, under 14 words>",
      "content": "<at most 2 short sentences, with **bold** around the key names/numbers/facts>"
    },
    {
      "title": "<short catchy heading, under 10 words>",
      "sub_title": "<one supporting line, under 14 words>",
      "content": "<at most 2 short sentences, with **bold** around key facts>"
    }
  ]
}

Rules:
- Generate exactly 2 or 3 "exp" entries: 2 if the article has limited distinct facts, 3 only if there are genuinely separate fact clusters (e.g. multiple named winners/teams, or a rich medal tally) worth their own card.
- The LAST "exp" entry must always be a "Static GK" tie-in: its "title" must start with "Static GK – " and its "content" must connect the article to one clear, verifiable static fact (a capital city, an established historical date, a well-known record) — never invent unverifiable recent statistics.
- Use the "past 6 months" context only for general thematic framing (e.g. "building on India's recent strong showing in archery"); never invent specific unverifiable recent numbers or dates beyond what's given in the source article.
- Hints must be short, factual teaser clues — not answers.
- Each "content" must be at most 2 short sentences. No long paragraphs.
- Return ONLY the JSON object, nothing else.`
}

// ---- tnpscPrompts.js ----
// Direct port of the Python desktop app's build_prompt() — same schema,
// same wording, same Tamil examples. Mechanically converted from the f-string
// so the wording matches exactly (only variable interpolation syntax changed).
const SUBJECT_NAMES = {
  Ta: 'Tamil',
  Hi: 'History',
  Po: 'Polity',
  Ge: 'Geography',
  Sci: 'Science',
  SS: 'Social Science',
}

function buildTnpscPrompt(params, pdfText) {
  const {
    subjectCode: sc,
    standard: std,
    term,
    chapter: ch,
    section: sec,
    language: lang,
    practiceCount: pc,
    finalCount: fc,
    qbCount: qbc,
  } = params

  const chapterId = `${sc}-${std}-${term}-${ch}-${sec}`
  const file1Name = `${chapterId}.json`
  const file2Name = `${chapterId}-qb.json`
  const subjectFull = SUBJECT_NAMES[sc] || sc
  const langCode = lang === 'Tamil' ? 'ta' : lang === 'English' ? 'en' : 'ta+en'
  const createdDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  return `You are a senior TNPSC exam content expert and Tamil Nadu state board textbook specialist.
Your job is to read the PDF text provided at the end and convert it into two production-ready JSON files for the TNPSC Learning App.

Think like an examiner, not a teacher. Every content block must teach a fact TNPSC will test.
Every question must be something a serious TNPSC aspirant needs to practice.

═══════════════════════════════════════════
CONFIRMED PARAMS (already filled — do NOT change these)
═══════════════════════════════════════════
SUBJECT_CODE : ${sc}
STANDARD     : ${std}
TERM         : ${term}
CHAPTER      : ${ch}
SECTION      : ${sec}
LANGUAGE     : ${lang}
SUBJECT_FULL : ${subjectFull}
LANG_CODE    : ${langCode}
CREATED_DATE : ${createdDate}

Derived (use exactly):
  chapterId  = "${chapterId}"
  FILE 1 name = "${file1Name}"
  FILE 2 name = "${file2Name}"

═══════════════════════════════════════════
STEP 1 — READ PDF FULLY BEFORE GENERATING
═══════════════════════════════════════════
Read every page completely.
Identify: chapter title, unit, author/poet names, sub-sections, poems, passages, tables,
highlight boxes (தெரியுமா, கற்பவை கற்றபின், நூல் வெளி, exam tips).
Note every TNPSC-testable fact: names, years, titles, terms, classifications.

COUNT TARGETS:
  practice questions  : EXACTLY ${pc}  — not one more, not one less
  finalExam questions : EXACTLY ${fc}  — not one more, not one less
  qb.json questions   : EXACTLY ${qbc} — not one more, not one less
  learnByMcq          : scale by page count —
      Pages 1-2 → 10-14   |   Pages 3-4 → 18-22
      Pages 5-6 → 22-25   |   Pages 7+  → 25

NEVER pad with weak questions. If content is genuinely thin, synthesise cross-page /
inference / application questions to reach the target rather than lowering quality.

═══════════════════════════════════════════
STEP 2 — TEXT FORMATTING TAGS
═══════════════════════════════════════════
<H>text</H> → Highlighter — headings, key terms
<B>text</B> → Bold        — names, dates, places, important facts
<U>text</U> → Underline   — exam tips, definitions
<I>text</I> → Italic      — book titles, poem titles, journal names
Every TNPSC-testable fact MUST be tagged. Do not over-tag plain prose.

═══════════════════════════════════════════
STEP 3 — ID NAMING (use chapterId = ${chapterId})
═══════════════════════════════════════════
LearnByMCQ : ${chapterId}-{PAGE}-{Q_NO}   e.g. ${chapterId}-2-1
Practice   : ${chapterId}-{PAGE}-P{NO}    e.g. ${chapterId}-2-P1
FinalExam  : ${chapterId}-{PAGE}-E{NO}    e.g. ${chapterId}-2-E1
QB         : ${chapterId}-QB-{001}          e.g. ${chapterId}-QB-001
All IDs MUST be unique across the entire output. QB uses 3-digit zero-padded numbers.

═══════════════════════════════════════════
STEP 4 — EXACT JSON SCHEMA FOR EVERY QUESTION TYPE
═══════════════════════════════════════════
COMMON FIELDS (present in ALL question types):
"id" (string) · "page" (number) · "questionType" (string) · "difficulty" ("easy"|"medium"|"hard")
"pageRefs" (array of page numbers, MANDATORY) · "isStarred" (false) · "isPrevYear" (false)
"explanation" (array of objects, MANDATORY for ALL types)

EXPLANATION FORMAT:
"explanation": [
  { "type": "paragraph", "text": "One clear sentence explaining why the correct answer is right." }
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 1: single_correct
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-1",
  "page": 2,
  "questionType": "single_correct",
  "difficulty": "easy",
  "pageRefs": [2],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "'அழகார்ந்த செந்தமிழே!' பாடலை இயற்றியவர் யார்?" }
  ],
  "options": [
    { "id": "A", "text": "பாவலரேறு பெருஞ்சித்திரனார்" },
    { "id": "B", "text": "கண்ணதாசன்" },
    { "id": "C", "text": "பாரதியார்" },
    { "id": "D", "text": "நாமக்கல் கவிஞர்" }
  ],
  "correctAnswer": ["A"],
  "explanation": [
    { "type": "paragraph", "text": "பாவலரேறு பெருஞ்சித்திரனார் இயற்றிய கனிச்சாறு தொகுப்பில் இப்பாடல் இடம்பெற்றுள்ளது." }
  ]
}
RULES:
  → "question" is ALWAYS an array of objects, never a plain string
  → For poem-based questions add a poem_excerpt object BEFORE the question paragraph:
    { "type": "poem_excerpt", "title": "poem title", "lines": ["line1","line2"] }
  → "options" always exactly 4 items with ids A, B, C, D
  → "correctAnswer" always an array with one id e.g. ["B"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 2: true_false
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-2",
  "page": 2,
  "questionType": "true_false",
  "difficulty": "easy",
  "pageRefs": [2],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "பெருஞ்சித்திரனாரின் நூல்கள் நாட்டுடைமையாக்கப்பட்டுள்ளன." }
  ],
  "correctAnswer": ["True"],
  "explanation": [
    { "type": "paragraph", "text": "நூல் வெளி பகுதியில் தெளிவாக கூறப்பட்டுள்ளது." }
  ]
}
RULES:
  → "question" is ALWAYS an array of objects
  → "correctAnswer" is ["True"] or ["False"] — no other values
  → NO "options" field
  → "explanation" MANDATORY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 3: fill_in_the_blank
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-3",
  "page": 2,
  "questionType": "fill_in_the_blank",
  "difficulty": "easy",
  "pageRefs": [2],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "'அன்னை மொழியே' பாடல் பெருஞ்சித்திரனாரின் __________ என்னும் தொகுப்பில் உள்ளது." }
  ],
  "correctAnswer": ["கனிச்சாறு (தொகுதி 1)"],
  "explanation": [
    { "type": "paragraph", "text": "கனிச்சாறு (தொகுதி 1) என்பது பெருஞ்சித்திரனாரின் கவிதை தொகுப்பு நூல்." }
  ]
}
RULES:
  → Blank written as __________ (10 underscores)
  → "correctAnswer" array with one answer string
  → NO "options" field · "explanation" MANDATORY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 4: multiple_correct
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-4",
  "page": 2,
  "questionType": "multiple_correct",
  "difficulty": "medium",
  "pageRefs": [2],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "பெருஞ்சித்திரனார் தமிழுணர்வை பரப்பிய இதழ்கள் எவை?" }
  ],
  "options": [
    { "id": "A", "text": "தென்மொழி" },
    { "id": "B", "text": "தமிழ்ச்சிட்டு" },
    { "id": "C", "text": "குமுதம்" },
    { "id": "D", "text": "ஆனந்த விகடன்" }
  ],
  "correctAnswer": ["A", "B"],
  "explanation": [
    { "type": "paragraph", "text": "தென்மொழி மற்றும் தமிழ்ச்சிட்டு இதழ்கள் வழியாக தமிழுணர்வைப் பரப்பினார்." }
  ]
}
RULES:
  → "correctAnswer" array with 2 or 3 correct ids
  → VARY combination: ["A","C"], ["B","D"], ["A","B","D"], ["B","C"], ["A","C","D"] — not always ["A","B"]
  → "explanation" MANDATORY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 5: statement_based
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-5",
  "page": 2,
  "questionType": "statement_based",
  "difficulty": "medium",
  "pageRefs": [2, 3],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "கீழ்க்காணும் கூற்றுகளில் சரியானவை எவை?" },
    { "type": "statement", "index": 1, "text": "Precise factual statement — TRUE" },
    { "type": "statement", "index": 2, "text": "Precise factual statement — TRUE" },
    { "type": "statement", "index": 3, "text": "Plausible but INCORRECT statement — common misconception" }
  ],
  "options": [
    { "id": "A", "text": "1 மட்டும் சரி" },
    { "id": "B", "text": "1 மற்றும் 2 சரி" },
    { "id": "C", "text": "2 மற்றும் 3 சரி" },
    { "id": "D", "text": "அனைத்தும் சரி" }
  ],
  "correctAnswer": ["B"],
  "explanation": [
    { "type": "paragraph", "text": "கூற்று 1 சரி, கூற்று 2 சரி, கூற்று 3 தவறு — காரணம் விளக்கம்." }
  ]
}
RULES:
  → Always exactly 3 statements; statement 3 is the misconception (never statement 1)
  → ROTATE correct combination: "1 மட்டும் சரி" | "1 மற்றும் 2 சரி" | "2 மற்றும் 3 சரி" | "அனைத்தும் சரி" | "1 மற்றும் 3 சரி"
  → Never the same option answer twice in a row
  → Explanation MUST judge all 3 statements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 6: match_the_following
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-6",
  "page": 2,
  "questionType": "match_the_following",
  "difficulty": "medium",
  "pageRefs": [2, 3],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "பொருத்துக (Match the following):" }
  ],
  "pairs": {
    "left":  ["Item 1", "Item 2", "Item 3", "Item 4"],
    "right": ["Shuffled C", "Shuffled A", "Shuffled D", "Shuffled B"]
  },
  "correctAnswer": [
    "Item 1-Match A",
    "Item 2-Match B",
    "Item 3-Match C",
    "Item 4-Match D"
  ],
  "explanation": [
    { "type": "paragraph", "text": "1→A, 2→B, 3→C, 4→D — காரணங்களுடன்." }
  ]
}
RULES:
  → Always exactly 4 pairs
  → right column order MUST be shuffled — NEVER the same order as the correct mapping
  → correctAnswer format: array of "leftItem-rightItem" strings (use exact strings from pairs)
  → "explanation" MANDATORY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 7: assertion_reason
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "${chapterId}-2-7",
  "page": 2,
  "questionType": "assertion_reason",
  "difficulty": "hard",
  "pageRefs": [2],
  "isStarred": false,
  "isPrevYear": false,
  "question": [
    { "type": "paragraph", "text": "கீழ்க்காண்பவற்றை படித்து சரியான விடையை தேர்ந்தெடு." },
    { "type": "assertion", "text": "A precise, testable claim about the topic." },
    { "type": "reason", "text": "A factual statement that may or may not explain the assertion." }
  ],
  "options": [
    { "id": "A", "text": "A மற்றும் R இரண்டும் சரி; R ஆனது A-ஐ விளக்குகிறது" },
    { "id": "B", "text": "A மற்றும் R இரண்டும் சரி; ஆனால் R ஆனது A-ஐ விளக்கவில்லை" },
    { "id": "C", "text": "A சரி; R தவறு" },
    { "id": "D", "text": "A தவறு; R சரி" }
  ],
  "correctAnswer": ["A"],
  "explanation": [
    { "type": "paragraph", "text": "Assertion சரி/தவறு — காரணம். Reason சரி/தவறு — காரணம். R ஆனது A-ஐ விளக்குகிறதா இல்லையா." }
  ]
}
RULES:
  → Options text MUST be exactly the 4 Tamil strings above (copy verbatim)
  → ROTATE correctAnswer across A, B, C, D — not always A
  → Explanation MUST evaluate both A and R, then the relationship

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POEM IN A QUESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a question is about a poem, include the excerpt FIRST, then the question:
"question": [
  { "type": "poem_excerpt", "title": "poem title", "author": "poet", "lines": ["line1","line2"] },
  { "type": "paragraph", "text": "question about the poem above" }
]
NEVER use "இப்பாடலில்" without a poem_excerpt object in the same question.

═══════════════════════════════════════════
STEP 5 — CONTENT BLOCKS
═══════════════════════════════════════════
Block types: title | paragraph | section | poem | highlight | image | table | author_info | exam_special

TITLE:        { "type":"title", "page":2, "text":"<H>அன்னை மொழியே</H>" }
PARAGRAPH:    { "type":"paragraph", "page":2, "text":"..." }   (max 3-4 sentences, tag key facts)
SECTION:      { "type":"section", "page":2, "title":"<H>நூல் வெளி</H>", "text":"..." }

POEM (include EVERY line from PDF, always include author):
{
  "type": "poem", "page": 2,
  "title": "<H>அழகார்ந்த செந்தமிழே!</H>",
  "author": "<B>பாவலரேறு பெருஞ்சித்திரனார்</B>",
  "lines": ["அன்னை மொழியே! அழகார்ந்த செந்தமிழே!", "முன்னைக்கும் முன்னை முகிழ்த்த நறுங்கனியே!"]
}

HIGHLIGHT:
{ "type":"highlight", "page":3, "highlightType":"exam_tip", "text":"<U>...</U>" }
  highlightType: "exam_tip" | "note" | "did_you_know" | "author_info"

TABLE:
{ "type":"table", "page":4, "title":"<H>...</H>", "headers":["col1","col2"], "rows":[["a","b"],["c","d"]] }

IMAGE:
{ "type":"image", "page":2, "imageType":"illustration", "url":"", "caption":"..." }

AUTHOR_INFO (for நூல் வெளி):
{
  "type":"author_info", "page":3,
  "name":"<B>பாவலரேறு பெருஞ்சித்திரனார்</B>",
  "realName":"<B>துரை. இராசமாணிக்கம்</B>",
  "works":["<I>கனிச்சாறு</I>","<I>நூறாசிரியம்</I>"],
  "awards":[], "note":"இவரது நூல்கள் <B>நாட்டுடைமையாக்கப்பட்டுள்ளன</B>."
}

EXAM_SPECIAL (for தெரியுமா / interesting facts):
{ "type":"exam_special", "page":5, "highlightType":"did_you_know", "text":"... <B>fact</B> ..." }

Every content block must contain at least one tagged fact. Skip pure explanatory prose with no testable fact.

═══════════════════════════════════════════
STEP 6 — QUESTION PURPOSE AND TYPE DISTRIBUTION
═══════════════════════════════════════════
LEARNBYMCQ — immediate comprehension; answer directly in the content shown.
  Mix: 35% single_correct, 20% true_false, 20% fill_in_the_blank, 15% multiple_correct, 10% statement_based.
  NO match_the_following. NO assertion_reason. Never reference a poem without naming it / poem_excerpt.

PRACTICE (EXACTLY ${pc}) — apply and connect.
  MANDATORY: min 2 match_the_following, min 1 assertion_reason.
  Mix: 25% match_the_following, 20% single_correct, 20% statement_based, 20% multiple_correct, 15% assertion_reason.

FINALEXAM (EXACTLY ${fc}) — simulate real TNPSC exam.
  All 7 types appear. Tricky but plausible distractors. Include ≥1 "எது பொருந்தாது?" exception question,
  ≥1 cross-page question, ≥1 trap question, ≥1 assertion_reason with answer B or C (not A).

QUESTIONBANK (EXACTLY ${qbc}) — pure TNPSC standard.
  All 7 types. 40% easy / 40% medium / 20% hard. explanation + pageRefs mandatory.
  Different angle from learnByMcq. Include ≥2 sequence, ≥2 exception, ≥2 cross-page synthesis questions.

═══════════════════════════════════════════
STEP 7 — ANSWER POSITION RANDOMIZATION
═══════════════════════════════════════════
single_correct: rotate B→D→A→C→B... never same position 2+ times in a row.
multiple_correct: vary combinations (not always ["A","B"]).
statement_based: rotate which statements are correct.
match_the_following: right column never in correct order.
assertion_reason: rotate A, B, C, D.

═══════════════════════════════════════════
STEP 8 — DISTRACTOR QUALITY
═══════════════════════════════════════════
NEVER: வன்முறை/போர்/குற்றம் for literature questions · obviously unrelated options ·
       "மேற்கூறிய அனைத்தும்" / "எதுவும் இல்லை" · same distractor repeated across questions.
ALWAYS: real names/titles from another chapter · real figures close but wrong ·
        correct attribute of a different item in same category · reversed fact · common student confusion.
Tamil literature examples: wrong poet right era (கண்ணதாசன் for பெருஞ்சித்திரனார்),
        wrong book right author (நூறாசிரியம் for கனிச்சாறு), wrong title right person (மொழிஞாயிறு for பாவலரேறு).

═══════════════════════════════════════════
STEP 9 — FILE 1 STRUCTURE (${file1Name})
═══════════════════════════════════════════
{
  "meta": {
    "chapterId": "${chapterId}",
    "chapterName": "[extract exact chapter name from PDF — if unclear use first heading found]",
    "unit": "[extract unit from PDF — if unclear use 'Unit ${ch}']",
    "subject": "${subjectFull}",
    "standard": ${std},
    "term": ${term},
    "chapter": ${ch},
    "section": ${sec},
    "language": "${langCode}",
    "board": "TNPSC",
    "academicYear": "2025-26",
    "syllabusVersion": "v1.0",
    "createdAtUtc": "${createdDate}",
    "updatedAtUtc": "${createdDate}"
  },
  "mcqTimeRules": {
    "single_correct": 40, "multiple_correct": 60, "match_the_following": 90,
    "assertion_reason": 60, "true_false": 30, "statement_based": 60,
    "fill_in_the_blank": 35, "negativeMarking": false
  },
  "modules": [
    {
      "content": { "estimatedTimeSeconds": 480, "blocks": [ ...content blocks (Step 5)... ] },
      "learnByMcq": { "questions": [ ...learnByMcq questions (Step 6 mix)... ] },
      "practice": { "questions": [ ...EXACTLY ${pc} practice questions... ] },
      "finalExam": {
        "timeLimitSeconds": 300, "negativeMarking": false,
        "questions": [ ...EXACTLY ${fc} finalExam questions... ]
      }
    }
  ]
}
Split into multiple modules only if the PDF has clearly distinct sub-topics (one module = one sub-section or 2-3 pages).

═══════════════════════════════════════════
STEP 10 — FILE 2 STRUCTURE (${file2Name})
═══════════════════════════════════════════
{
  "chapterId": "${chapterId}",
  "chapterName": "[exact chapter name from PDF]",
  "subject": "${subjectFull}",
  "standard": ${std},
  "term": ${term},
  "chapter": ${ch},
  "section": ${sec},
  "sourcePages": [list every page number in this batch],
  "totalQuestions": ${qbc},
  "questions": [ ...EXACTLY ${qbc} QB questions (Step 6 QB rules)... ]
}

═══════════════════════════════════════════
STEP 11 — OUTPUT FORMAT (CRITICAL — follow exactly)
═══════════════════════════════════════════
Output FILE 1 first, then FILE 2, using these EXACT label lines:

=== FILE 1: ${file1Name} ===
{ complete FILE 1 JSON }
=== FILE 2: ${file2Name} ===
{ complete FILE 2 JSON }

ABSOLUTE RULES:
  ✗ NO markdown code fences (no triple-backtick json, no triple-backtick)
  ✗ NO comments inside JSON · NO trailing commas · NO missing braces/brackets
  ✗ NO explanation text before, between, or after the two JSON blocks
  ✓ practice = EXACTLY ${pc} · finalExam = EXACTLY ${fc} · QB = EXACTLY ${qbc}
  ✓ Every question has: explanation, pageRefs, isStarred (false), isPrevYear (false)
  ✓ All IDs unique, prefixed with "${chapterId}"
  ✓ Poems in content blocks contain every line from the PDF
  ✓ If near the token limit, reduce counts slightly but ALWAYS close every array and object — never truncate mid-JSON

SELF-CHECK BEFORE OUTPUTTING:
  □ Both === FILE 1: === and === FILE 2: === labels present
  □ Each JSON block is independently valid (no trailing commas, all brackets closed)
  □ practice=${pc}, finalExam=${fc}, QB=${qbc}
  □ All 7 types used in finalExam and QB
  □ Correct-answer positions rotated (not all A)

═══════════════════════════════════════════
PDF TEXT TO PROCESS (only these pages)
═══════════════════════════════════════════
${pdfText}
`
}

// ---- caQuestionPrompts.js ----
// Turns a day's Current Affairs cas entries into TNPSC/competitive-exam-style
// MCQ objects — 2 per cas entry, in en/ta/hi. "qid" is deliberately NOT part
// of the model's output: it's assigned by the caller from its own running
// sequence, matching the "never trust the model with our own numbering"
// convention used elsewhere in this worker (see handleGenerate's day number).
function buildCaQuestionPrompt(casItems) {
  const articlesBlock = casItems
    .map(
      (c, i) => `
Article ${i + 1}:
Category: ${c.category || 'General'}
Date: ${c.date || ''}
Title: ${c.title_en}
Details: ${c.desc_en || ''}`
    )
    .join('\n')

  return `You are a senior current-affairs question setter for Indian competitive exams (TNPSC, SSC, RRB, bank exams and similar).

Always respond ONLY with a valid JSON array. No markdown, no explanation, no backticks. Just the raw JSON array.

You will be given ${casItems.length} current-affairs article(s) below. Each article's "Details" field is a list of bullet points separated by "~~~~", usually with an emoji prefix (🔹, 📌, etc.) — treat "~~~~" as a line break, not literal content. Some articles also carry a "📘 Static CA" section further down with related background/static general-knowledge facts (acts, founding years, headquarters, historical context) — that section is fair game for questions too, since these exams blend current-affairs with static GK exactly this way.
${articlesBlock}

Task:
For EACH article above, write EXACTLY 2 multiple-choice questions a serious TNPSC/competitive-exam aspirant would need to practice. When an article has a "📘 Static CA" section with a strong standalone fact, draw one question from the main dynamic news and the other from that static fact; otherwise both questions may come from the dynamic news.

Output a single JSON array with exactly ${casItems.length * 2} objects, grouped by article in the same order given (the first 2 objects are for Article 1, the next 2 for Article 2, and so on). Each object must have exactly this shape:
{
  "q": "<question in English>",
  "q_ta": "<same question in Tamil>",
  "q_hi": "<same question in Hindi>",
  "is_m_o": false,
  "ans": "A",
  "o_a": "<option A in English>",
  "o_a_ta": "<option A in Tamil>",
  "o_a_hi": "<option A in Hindi>",
  "o_b": "<option B in English>",
  "o_b_ta": "<option B in Tamil>",
  "o_b_hi": "<option B in Hindi>",
  "o_c": "<option C in English>",
  "o_c_ta": "<option C in Tamil>",
  "o_c_hi": "<option C in Hindi>",
  "o_d": "<option D in English>",
  "o_d_ta": "<option D in Tamil>",
  "o_d_hi": "<option D in Hindi>",
  "exp": "<1-2 sentence explanation in English citing the source fact>",
  "exp_ta": "<same explanation in Tamil>",
  "exp_hi": "<same explanation in Hindi>",
  "ca_c": "<category label>"
}

Rules:
- Exactly 4 options (o_a..o_d), exactly one correct, "ans" holds its letter ("A"|"B"|"C"|"D").
- Rotate the correct answer's letter across questions — do not make every "ans" the same letter.
- Distractors must be plausible (real related names/numbers/places), never absurd or obviously wrong.
- Keep questions and options strictly factual and verifiable from the given text — never invent facts, dates, or numbers not present in the article.
- "ca_c" should normally match the article's given Category; use a more specific standard news-category label (e.g. "International", "National", "Sports", "Science", "Economy", "Person in News", "Awards") only when the question is drawn from a static-GK tangent that's clearly a different topic than the main category.
- Every Tamil and Hindi field must be a real, accurate, natural translation — never left in English, never machine-garbled.
- Do NOT include a "qid" field in any object — it is added separately by the caller.
- Return ONLY the JSON array, nothing else.`
}

// ---- caQbPrompts.js ----
// Turns one Current Affairs article into a full "question bank" batch — at
// least 2 questions covering all 4 exam types (MCQ, STATEMENT, MATCH,
// FILL_BLANK), each in en/hi/ta. Ported near-verbatim from the prompt the
// admin already designed and hand-tested; only the topic/text interpolation
// at the end was added. "qid" is deliberately absent from the schema — it's
// assigned by the caller from its own running sequence, matching the
// "never trust the model with our own numbering" convention used elsewhere.
function buildCaQbPrompt({ topic, text }) {
  return `You are an expert Indian competitive exam question setter
(UPSC, TNPSC, SSC, Banking level).

The input text is trusted editorial current affairs content.
Do NOT mention sources or external references (PIB, The Hindu, etc.)
Do NOT say "according to reports".

TASK:
From the given current affairs text, generate MULTIPLE exam-quality questions.

MANDATORY REQUIREMENTS:
- Generate AT LEAST 2 questions
- Questions MUST include ALL FOUR TYPES:
  1) MCQ (normal multiple-choice question with remembrance tip)
  2) STATEMENT type (2–3 statements with options like "1 and 2 only")
  3) MATCH type (match-the-following, NO drag-and-drop, exam-style options)
  4) FILL_BLANK type (year, place, organisation, index, country, capital etc.)

CONTENT RULES:
- Include BOTH:
  • Dynamic current affairs questions (from the news)
  • Static current affairs questions (background facts related to the topic)
- Assign difficulty for EACH question: Easy / Medium / Hard
- All facts must be standard, exam-accepted facts
- Do NOT invent obscure or risky facts
- Static facts should be safe (location, year, programme, authority)
- Provide a short, exam-friendly remembrance tip for EACH question

LANGUAGE RULES:
- Generate content in THREE languages:
  • English (en)
  • Hindi (hi)
  • Tamil (ta)

OUTPUT RULES:
- Output STRICT JSON ARRAY only
- Do NOT include any explanation outside JSON
- Do NOT add markdown, headings, or comments
- Do NOT include a "qid" field in any object — it is added separately by the caller

EACH QUESTION OBJECT MUST FOLLOW THIS EXACT STRUCTURE:

{
  "type": "MCQ | STATEMENT | MATCH | FILL_BLANK",
  "difficulty": "Easy | Medium | Hard",
  "question": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  },
  "options": {
    "en": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "hi": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "ta": { "A": "...", "B": "...", "C": "...", "D": "..." }
  },
  "answer": "A",
  "explanation": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  },
  "tip": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  }
}

CURRENT AFFAIRS TEXT:
${text}

PRIMARY TOPIC:
${topic}`
}

// ---- caQbValidate.js ----
const CA_QB_REQUIRED_LANGS = ['en', 'hi', 'ta']
const CA_QB_OPTION_LETTERS = ['A', 'B', 'C', 'D']
const CA_QB_VALID_TYPES = ['MCQ', 'STATEMENT', 'MATCH', 'FILL_BLANK']
const CA_QB_VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const CA_QB_SIBLING_FIELDS = ['options', 'answer', 'explanation', 'tip', 'type', 'difficulty']

function isLangTextMap(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    CA_QB_REQUIRED_LANGS.every((lang) => typeof value[lang] === 'string' && value[lang].trim().length > 0)
  )
}

function isOptionsMap(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    CA_QB_REQUIRED_LANGS.every(
      (lang) =>
        value[lang] &&
        typeof value[lang] === 'object' &&
        CA_QB_OPTION_LETTERS.every((letter) => typeof value[lang][letter] === 'string' && value[lang][letter].trim().length > 0)
    )
  )
}

function hoistMisplacedFields(question) {
  if (!question || typeof question !== 'object' || !question.question || typeof question.question !== 'object') {
    return question
  }
  const fixed = { ...question, question: { ...question.question } }
  for (const field of CA_QB_SIBLING_FIELDS) {
    if (fixed[field] === undefined && fixed.question[field] !== undefined) {
      fixed[field] = fixed.question[field]
      delete fixed.question[field]
    }
  }
  return fixed
}

function validateQuestion(question, position) {
  const errors = []
  const label = `Question ${position}`

  if (!question || typeof question !== 'object') {
    return [`${label}: not an object.`]
  }
  if (!CA_QB_VALID_TYPES.includes(question.type)) {
    errors.push(`${label}: "type" must be one of ${CA_QB_VALID_TYPES.join('/')} (got ${JSON.stringify(question.type)}).`)
  }
  if (!CA_QB_VALID_DIFFICULTIES.includes(question.difficulty)) {
    errors.push(`${label}: "difficulty" must be one of ${CA_QB_VALID_DIFFICULTIES.join('/')} (got ${JSON.stringify(question.difficulty)}).`)
  }
  if (!isLangTextMap(question.question)) {
    errors.push(`${label}: "question" must be an { en, hi, ta } object of non-empty strings.`)
  }
  if (!isOptionsMap(question.options)) {
    errors.push(`${label}: "options" must be an { en, hi, ta } object, each with non-empty A/B/C/D strings.`)
  }
  if (!CA_QB_OPTION_LETTERS.includes(question.answer)) {
    errors.push(`${label}: "answer" must be one of A/B/C/D (got ${JSON.stringify(question.answer)}).`)
  }
  if (!isLangTextMap(question.explanation)) {
    errors.push(`${label}: "explanation" must be an { en, hi, ta } object of non-empty strings.`)
  }
  if (!isLangTextMap(question.tip)) {
    errors.push(`${label}: "tip" must be an { en, hi, ta } object of non-empty strings.`)
  }

  return errors
}

function normalizeAndValidateCaQb(rawData) {
  const data = rawData.map(hoistMisplacedFields)
  const errors = data.flatMap((question, i) => validateQuestion(question, i + 1))
  return { data, errors }
}

// ---- index.js ----
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

  const { data: normalized, errors } = normalizeAndValidateCaQb(data)
  if (errors.length > 0) {
    return json(env, { error: `AI response failed structure validation:\n${errors.join('\n')}` }, 502)
  }

  return json(env, { data: normalized })
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
