import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const defaultInputs = [
  "content",
  "posts",
  "blog",
  "_posts",
  "articles",
  path.join("src", "content", "blog"),
  "drafts",
];

function usage() {
  return `Usage:
  node generate-content-audit.js [--content <file-or-directory>]... [--output-dir <directory>]

Options:
  --content, --content-dir  Add a Markdown file or directory to audit. Repeatable.
  --output-dir             Write report files to this directory. Defaults to the current directory.
  --help                   Show this help text.

When no content path is supplied, the generator discovers common content directories.`;
}

function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a path.`);
  }
  return value;
}

function parseArgs(args) {
  const inputs = [];
  let outputDir = root;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--content" || arg === "--content-dir") {
      inputs.push(path.resolve(root, requireValue(args, index, arg)));
      index += 1;
      continue;
    }
    if (arg.startsWith("--content=") || arg.startsWith("--content-dir=")) {
      const value = arg.slice(arg.indexOf("=") + 1);
      if (!value) throw new Error(`${arg.split("=")[0]} requires a path.`);
      inputs.push(path.resolve(root, value));
      continue;
    }
    if (arg === "--output-dir") {
      outputDir = path.resolve(root, requireValue(args, index, arg));
      index += 1;
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      const value = arg.slice(arg.indexOf("=") + 1);
      if (!value) throw new Error("--output-dir requires a path.");
      outputDir = path.resolve(root, value);
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
    }
    inputs.push(path.resolve(root, arg));
  }

  const resolvedInputs = inputs.length
    ? inputs
    : defaultInputs.map((input) => path.resolve(root, input)).filter((input) => fs.existsSync(input));

  if (!resolvedInputs.length) {
    throw new Error(
      "No content paths were found. Run with --content <file-or-directory> from the target repository root."
    );
  }

  return {
    inputs: [...new Set(resolvedInputs)],
    outputDir,
  };
}

function normalizePath(file) {
  return file.split(path.sep).join("/");
}

function displayPath(file, relativeTo = root) {
  const relative = path.relative(relativeTo, file);
  return normalizePath(relative || ".");
}

function listMarkdownFiles(input) {
  if (!fs.existsSync(input)) {
    throw new Error(`Content path does not exist: ${displayPath(input)}`);
  }

  const stats = fs.statSync(input);
  if (stats.isFile()) {
    return /\.(md|mdx)$/i.test(input) ? [input] : [];
  }
  if (!stats.isDirectory()) return [];

  const files = [];
  for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
    const fullPath = path.join(input, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function readPreviousScores(dataPath) {
  if (!fs.existsSync(dataPath)) return new Map();
  const source = fs.readFileSync(dataPath, "utf8");
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(source, sandbox);
    return new Map(
      (sandbox.window.CONTENT_VOICE_AUDIT_DATA || []).map(
        (item) => [item.id || item.sourcePath || item.slug, item.score]
      )
    );
  } catch {
    return new Map();
  }
}

function cleanScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const fallback = path.basename(file).replace(/\.(md|mdx)$/i, "");
  if (!match) {
    return {
      meta: { title: fallback, slug: fallback },
      body: text,
    };
  }

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!pair) continue;
    meta[pair[1]] = cleanScalar(pair[2]);
  }
  return {
    meta: {
      ...meta,
      title: meta.title || fallback,
      slug: meta.slug || fallback,
    },
    body: match[2],
  };
}

function stripCodeBlocks(body) {
  return body.replace(/```[\s\S]*?```/g, "");
}

function wordCount(text) {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’%-]*/gu);
  return words ? words.length : 0;
}

function splitParagraphs(body) {
  return stripCodeBlocks(body)
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isBodyParagraph(paragraph) {
  return !paragraph.startsWith("#")
    && !paragraph.startsWith("- ")
    && !paragraph.startsWith("* ")
    && !paragraph.startsWith("|")
    && !paragraph.startsWith(">")
    && !/^\d+\.\s/.test(paragraph);
}

function sentenceCount(paragraph) {
  const matches = paragraph.match(/[。！？]|[.!?](?=\s|$)/g);
  return matches ? matches.length : 1;
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function countUniqueMatchStarts(text, regexes) {
  const positions = new Set();
  for (const regex of regexes) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      positions.add(match.index);
      if (!match[0].length) regex.lastIndex += 1;
    }
  }
  return positions.size;
}

function findEvidenceSection(body) {
  const heading = /^(#{2,6})\s+(receipts|sources|evidence|references)\s*$/im.exec(body);
  if (!heading) return { heading: null, items: 0 };

  const sectionStart = heading.index + heading[0].length;
  const remainder = body.slice(sectionStart);
  const nextHeading = /^#{1,6}\s+/m.exec(remainder);
  const section = nextHeading ? remainder.slice(0, nextHeading.index) : remainder;
  return {
    heading: heading[2],
    items: countMatches(section, /^\s*(?:[-*+]|\d+\.)\s+/gm),
  };
}

function analyze(body) {
  const bodyNoCode = stripCodeBlocks(body);
  const paragraphs = splitParagraphs(body);
  const bodyParagraphs = paragraphs.filter(isBodyParagraph);
  const singleLineParagraphs = bodyParagraphs.filter(
    (paragraph) => sentenceCount(paragraph) <= 1 && wordCount(paragraph) <= 24
  );
  const shortPunchParagraphs = bodyParagraphs.filter((paragraph) => wordCount(paragraph) <= 8);
  const evidence = findEvidenceSection(body);
  const externalLinks = countMatches(body, /\]\(https?:\/\//g);
  const yearMentions = countMatches(bodyNoCode, /\b20\d{2}\b|\b19\d{2}\b/g);
  const numbers = countMatches(bodyNoCode, /\b\d+(\.\d+)?\b/g);
  const notBut = countUniqueMatchStarts(bodyNoCode, [
    /\bnot\b[^.!?\n]{0,90}\bbut\b/gi,
    /\bnot because\b|\bnot merely\b|\bnot just\b|\bnot necessarily\b/gi,
  ]);
  const ruleOfThree = countMatches(bodyNoCode, /\b\w+,\s+\w+,\s+and\s+\w+/g);
  const headings = countMatches(bodyNoCode, /^#{2,6}\s+/gm);
  const words = wordCount(bodyNoCode);
  const singleRatio = bodyParagraphs.length
    ? singleLineParagraphs.length / bodyParagraphs.length
    : 0;
  const evidenceScore = Math.min(14, evidence.items * 3 + externalLinks);
  const specificityScore = Math.min(12, yearMentions * 2 + Math.floor(numbers / 4) + externalLinks);
  const structureScore = Math.min(8, headings);
  const cadencePenalty = Math.min(
    18,
    Math.round(singleRatio * 24) + Math.max(0, shortPunchParagraphs.length - 5)
  );
  const formulaPenalty = Math.min(8, notBut * 2 + Math.max(0, ruleOfThree - 4));
  const lengthPenalty = words > 2600 ? 4 : words < 650 ? 5 : 0;
  const score = Math.max(
    45,
    Math.min(
      92,
      Math.round(
        68
        + evidenceScore
        + specificityScore
        + structureScore
        - cadencePenalty
        - formulaPenalty
        - lengthPenalty
      )
    )
  );

  return {
    paragraphs: bodyParagraphs.length,
    singleLineParagraphs: singleLineParagraphs.length,
    singleRatio,
    evidenceHeading: evidence.heading,
    evidenceItems: evidence.items,
    externalLinks,
    yearMentions,
    numbers,
    notBut,
    ruleOfThree,
    headings,
    words,
    score,
  };
}

function scoreBand(score) {
  if (score >= 82) return "strong";
  if (score >= 72) return "solid";
  if (score >= 62) return "needs work";
  return "high risk";
}

function quantity(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function makeReview(meta, source, sourcePath, stats, previousScores) {
  const prev = previousScores.has(sourcePath) ? previousScores.get(sourcePath) : null;
  const changed = prev === null || prev !== stats.score;
  const cadencePct = Math.round(stats.singleRatio * 100);

  const verdict = `Piece scored ${stats.score}/100 (${scoreBand(stats.score)}). `
    + `${stats.evidenceItems
      ? `It has ${quantity(stats.evidenceItems, "evidence item")}`
      : "It has no dedicated evidence items"} and ${cadencePct}% short single-line body paragraphs.`;

  const cadence = stats.singleRatio > 0.38
    ? `Cadence risk is the main tell: ${stats.singleLineParagraphs} of ${stats.paragraphs} body paragraphs are short one-line beats. The piece may read like a social thread when the argument needs fuller development.`
    : `Cadence is mostly controlled: ${stats.singleLineParagraphs} of ${stats.paragraphs} body paragraphs are short one-line beats. Check isolated lines against the author's intended rhythm before changing them.`;

  const evidence = stats.evidenceItems
    ? `The evidence posture is helped by ${quantity(stats.evidenceItems, "item")} in the ${stats.evidenceHeading} section and ${quantity(stats.externalLinks, "external link")}. Check that each source or observation supports a specific claim.`
    : `The evidence posture may be weak because no dedicated evidence items were found. For claims that depend on research, measurement, or experience, add an appropriate source, citation, or first-party observation.`;

  const structure = stats.headings >= 4
    ? `Structure is scannable with ${quantity(stats.headings, "section heading")}. Confirm that the sequence develops the argument rather than merely dividing the text.`
    : `Structure is light with ${quantity(stats.headings, "section heading")}. Consider clarifying the progression from evidence to implication and action.`;

  const formulaParts = [];
  if (stats.notBut > 2) formulaParts.push(`${stats.notBut} not-X-but-Y style turns`);
  if (stats.ruleOfThree > 5) formulaParts.push(`${stats.ruleOfThree} rule-of-three constructions`);
  const voice = formulaParts.length
    ? `Voice risk: ${formulaParts.join(" and ")}. Repetition can make the prose feel templated even when each instance works by itself.`
    : stats.notBut > 0
      ? `Formula signal: ${stats.notBut} not-X-but-Y style ${stats.notBut === 1 ? "turn was" : "turns were"} detected. Review the phrasing in context; an isolated use may fit the author's voice without creating a pattern.`
    : "No major formula tells were detected. Confirm that memorable lines are supported by the argument and fit the author's voice.";

  const fixes = [
    stats.singleRatio > 0.32
      ? "Merge explanatory one-line paragraphs where fuller development would improve comprehension."
      : null,
    stats.evidenceItems === 0
      ? "Add evidence, sources, or a first-party observation where material claims need support."
      : null,
    stats.notBut > 2
      ? "Trim repeated not-X-but-Y turns or recast them as direct claims."
      : null,
    stats.yearMentions + stats.numbers < 5
      ? "Add one dated, measured, or otherwise concrete example to ground the thesis."
      : null,
  ].filter(Boolean).join(" ");

  return {
    id: sourcePath,
    slug: meta.slug,
    title: meta.title || meta.slug,
    source,
    sourcePath,
    score: stats.score,
    prev,
    changed,
    verdict,
    cadence,
    evidence,
    structure,
    voice,
    fixes: fixes || "No urgent structural fix. Preserve the current shape and keep evidence tied to claims.",
    metrics: stats,
  };
}

function buildData(inputs, outputDir, previousScores) {
  const files = new Map();
  for (const input of inputs) {
    const source = displayPath(input);
    for (const file of listMarkdownFiles(input)) {
      files.set(path.resolve(file), source);
    }
  }

  if (!files.size) {
    throw new Error("The selected content paths contain no .md or .mdx files.");
  }

  return [...files.entries()].map(([file, source]) => {
    const text = fs.readFileSync(file, "utf8");
    const { meta, body } = parseFrontmatter(text, file);
    const stats = analyze(body);
    const sourcePath = displayPath(file, outputDir);
    return makeReview(meta, source, sourcePath, stats, previousScores);
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function writeData(data, dataPath) {
  const safeJson = JSON.stringify(data, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const header = `/* Content voice audit data: ${quantity(data.length, "piece")}. */\n`;
  fs.writeFileSync(dataPath, `${header}window.CONTENT_VOICE_AUDIT_DATA = ${safeJson};\n`);
}

function writeHtml(data, htmlPath, dataFileName) {
  const generated = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Content Voice Audit</title>
<style>
:root{--bg:#0f1115;--panel:#171a21;--panel2:#1d2129;--ink:#e6e8ec;--muted:#9aa3b2;--line:#262b35;--accent:#7aa2ff;--good:#3fb950;--mid:#d29922;--bad:#f85149}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}a{color:var(--accent)}.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
header{padding:38px 0 26px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#13161c,#0f1115)}h1{margin:0 0 6px;font-size:32px}.sub{color:var(--muted);margin:0 0 18px}.stats{display:flex;flex-wrap:wrap;gap:14px}.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 16px;min-width:130px}.stat .n{font-size:24px;font-weight:700}.stat .l{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.lens,.corr{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin-top:18px;color:#c7cde0}.lens b{color:#fff}section{padding:26px 0}h2{font-size:20px;margin:0 0 14px}.controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}.controls input,.controls button{background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:9px 12px}.controls button{cursor:pointer}.controls button.active{border-color:var(--accent)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-weight:600}.pill{display:inline-block;min-width:34px;text-align:center;padding:2px 8px;border-radius:999px;font-weight:700;font-size:13px}.b-good{background:rgba(63,185,80,.16);color:#7ee787;border:1px solid rgba(63,185,80,.4)}.b-mid{background:rgba(210,153,34,.16);color:#e3b341;border:1px solid rgba(210,153,34,.4)}.b-bad{background:rgba(248,81,73,.16);color:#ff7b72;border:1px solid rgba(248,81,73,.4)}.delta{font-size:12px;font-weight:700}.d-up{color:#7ee787}.d-down{color:#ff7b72}.d-flat{color:var(--muted)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:0 0 16px}.card h3{margin:0;font-size:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.slug{color:var(--muted);font-size:12px;font-family:ui-monospace,Menlo,Consolas,monospace}.verdict{color:#cdd3e0;font-style:italic;margin:10px 0 14px}.field{margin:10px 0}.k{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:3px}.v{color:#dfe3ea;font-size:14.6px}.meter{height:6px;border-radius:4px;background:var(--line);overflow:hidden;margin:12px 0 2px}.meter i{display:block;height:100%}footer{color:var(--muted);font-size:13px;padding:30px 0 60px;border-top:1px solid var(--line)}
</style>
</head>
<body>
<header><div class="wrap">
<h1>Content Voice Audit</h1>
<p class="sub">Editorial audit of ${quantity(data.length, "Markdown piece")}. Generated ${generated}. Scores combine cadence, evidence, specificity, structure, and formula-pattern signals.</p>
<div class="stats" id="stats"></div>
<div class="lens"><b>Interpretation:</b> Scores are heuristic signals, not writing grades. Apply repository guidance and the author's demonstrated preferences before revising any flagged passage.</div>
</div></header>
<main class="wrap">
<section><h2>Current Read</h2><div class="corr" id="summary"></div></section>
<section><h2>Scoreboard</h2><div class="controls"><input id="q" placeholder="Filter by title or slug"><button data-filter="all" class="active">All</button><button data-filter="risk">Needs Work</button></div><table id="table"></table></section>
<section><h2>Editorial Notes</h2><div id="cards"></div></section>
</main>
<footer><div class="wrap">Data file: <code>${dataFileName}</code>.</div></footer>
<script src="${dataFileName}"></script>
<script>
const data = window.CONTENT_VOICE_AUDIT_DATA || [];
let filter = "all";
const h = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const href = value => h(encodeURI(value));
const band = score => score >= 82 ? "b-good" : score >= 72 ? "b-mid" : "b-bad";
const delta = item => item.prev === null ? '<span class="delta d-flat">new</span>' : item.score > item.prev ? '<span class="delta d-up">+' + (item.score - item.prev) + '</span>' : item.score < item.prev ? '<span class="delta d-down">' + (item.score - item.prev) + '</span>' : '<span class="delta d-flat">0</span>';
function visible(){
  const query = document.querySelector("#q").value.toLowerCase();
  return data.filter(item => {
    if (filter === "risk" && item.score >= 72) return false;
    return item.title.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query);
  });
}
function renderStats(){
  const average = Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length);
  const risk = data.filter(item => item.score < 72).length;
  const best = data[0];
  document.querySelector("#stats").innerHTML = [
    ['Pieces', data.length],
    ['Average', average],
    ['Needs Work', risk],
    ['Top Score', best.score]
  ].map(([label, number]) => '<div class="stat"><div class="n">' + number + '</div><div class="l">' + label + '</div></div>').join("");
}
function renderSummary(){
  const needs = data.filter(item => item.score < 72).slice().sort((a,b) => a.score - b.score).slice(0,5);
  const cadence = data.slice().sort((a,b) => b.metrics.singleRatio - a.metrics.singleRatio).slice(0,5);
  const newItems = data.filter(item => item.prev === null).map(item => h(item.title));
  document.querySelector("#summary").innerHTML = '<p><b>New coverage:</b> ' + (newItems.length ? newItems.join(", ") : "No new pieces") + '.</p>' +
    '<p><b>Lowest current scores:</b> ' + needs.map(item => h(item.title) + ' (' + item.score + ')').join("; ") + '.</p>' +
    '<p><b>Highest cadence risk:</b> ' + cadence.map(item => h(item.title) + ' (' + Math.round(item.metrics.singleRatio * 100) + '%)').join("; ") + '.</p>';
}
function renderTable(){
  const rows = visible();
  document.querySelector("#table").innerHTML = '<thead><tr><th>Score</th><th>Delta</th><th>Input</th><th>Title</th><th>Single-Line</th><th>Evidence</th><th>Formula Tells</th></tr></thead><tbody>' +
    rows.map(item => '<tr><td><span class="pill ' + band(item.score) + '">' + item.score + '</span></td><td>' + delta(item) + '</td><td>' + h(item.source) + '</td><td><b><a href="' + href(item.sourcePath) + '">' + h(item.title) + '</a></b><br><span class="slug">' + h(item.slug) + '</span></td><td>' + Math.round(item.metrics.singleRatio * 100) + '%</td><td>' + item.metrics.evidenceItems + '</td><td>' + item.metrics.notBut + '</td></tr>').join("") + '</tbody>';
}
function renderCards(){
  document.querySelector("#cards").innerHTML = visible().map(item => '<article class="card"><h3><span class="pill ' + band(item.score) + '">' + item.score + '</span><a href="' + href(item.sourcePath) + '">' + h(item.title) + '</a> <span class="slug">' + h(item.slug) + '</span></h3><div class="meter"><i style="width:' + item.score + '%;background:' + (item.score >= 82 ? 'var(--good)' : item.score >= 72 ? 'var(--mid)' : 'var(--bad)') + '"></i></div><p class="verdict">' + h(item.verdict) + '</p>' + ['cadence','evidence','structure','voice','fixes'].map(key => '<div class="field"><div class="k">' + key + '</div><div class="v">' + h(item[key]) + '</div></div>').join("") + '</article>').join("");
}
function render(){renderTable();renderCards();}
document.querySelector("#q").addEventListener("input", render);
document.querySelectorAll("button[data-filter]").forEach(button => button.addEventListener("click", () => {filter = button.dataset.filter; document.querySelectorAll("button[data-filter]").forEach(item => item.classList.remove("active")); button.classList.add("active"); render();}));
renderStats();renderSummary();render();
</script>
</body>
</html>
`;
  fs.writeFileSync(htmlPath, html);
}

try {
  const options = parseArgs(process.argv.slice(2));
  const dataPath = path.join(options.outputDir, "content-voice-audit-data.js");
  const htmlPath = path.join(options.outputDir, "content-voice-audit.html");
  const previousScores = readPreviousScores(dataPath);
  const data = buildData(options.inputs, options.outputDir, previousScores);
  fs.mkdirSync(options.outputDir, { recursive: true });
  writeData(data, dataPath);
  writeHtml(data, htmlPath, path.basename(dataPath));
  console.log(`Generated content voice audit for ${quantity(data.length, "piece")}.`);
  console.log(`Report: ${htmlPath}`);
  console.log(`Data: ${dataPath}`);
} catch (error) {
  console.error(`Content voice audit failed: ${error.message}`);
  process.exitCode = 1;
}
