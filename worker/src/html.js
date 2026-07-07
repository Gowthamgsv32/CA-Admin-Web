function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildResultHtml({ day, total, category, title, tip, examples, pro_tip, goal }) {
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

export function buildGrammarHtml({
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

export function buildPhraseHtml({ day, topic, questions }) {
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
