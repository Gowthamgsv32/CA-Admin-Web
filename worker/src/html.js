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
