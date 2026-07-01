// ============================================================
//  ALIEN INFECTION — Procedural Logic Puzzle Generator
// ============================================================
//  Architecture
//  ─────────────────────────────────────────────────────────
//  1. Utilities           — shuffle, combinations, pick, etc.
//  2. Template Registry   — register / look up statement types
//  3. Statement Templates — 25+ expandable templates
//  4. World Generator     — random crew / infection / truth
//  5. Statement Assigner  — assigns valid templates per speaker
//  6. Puzzle Validator    — brute-force unique-solution check
//  7. Game Controller     — top-level generate / check flow
//  8. UI Controller       — render, toggle, reveal
//  9. Stars + Init        — background canvas, boot
// ============================================================

'use strict';

// ============================================================
// 1. UTILITIES
// ============================================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(lo, hi) {          // inclusive on both ends
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** All k-element subsets of arr (no repeats). */
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k || k < 0) return [];
  const [head, ...tail] = arr;
  const withHead    = combinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// ============================================================
// 2. TEMPLATE REGISTRY
// ============================================================

const TemplateRegistry = [];

/**
 * Register a statement template.
 *
 * Shape:
 * {
 *   id:        string          – unique key
 *   paramCount: 0 | 1 | 2     – how many OTHER crew members are needed
 *   evaluate(crew, speaker, params): boolean  – truth value in a world
 *   render(speaker, params):   string         – English sentence
 * }
 *
 * `crew`    – full candidate crew array (for count-based queries)
 * `speaker` – the speaking CrewMember from the candidate world
 * `params`  – array of resolved CrewMember objects (from candidate world)
 *
 * Adding a new template here automatically makes it part of every future puzzle.
 */
function registerTemplate(tmpl) {
  TemplateRegistry.push(tmpl);
}

function findTemplate(id) {
  return TemplateRegistry.find(t => t.id === id) || null;
}

// ============================================================
// 3. STATEMENT TEMPLATES
// ============================================================

// ── Self-reference (paramCount: 0) ─────────────────────────

registerTemplate({
  id: 'SELF_INFECTED',
  paramCount: 0,
  evaluate(crew, speaker, params) { return speaker.infected; },
  render(speaker, params)         { return 'I am infected.'; }
});

registerTemplate({
  id: 'SELF_NOT_INFECTED',
  paramCount: 0,
  evaluate(crew, speaker, params) { return !speaker.infected; },
  render(speaker, params)         { return 'I am not infected.'; }
});

registerTemplate({
  // Both truthtellers AND liars can legitimately say this.
  // Truthteller: evaluates true  → consistent ✓
  // Liar:        evaluates false → consistent ✓  (a lie)
  id: 'SELF_TRUTHFUL',
  paramCount: 0,
  evaluate(crew, speaker, params) { return speaker.truthful; },
  render(speaker, params)         { return 'I am telling the truth.'; }
});

// ── One other crew member (paramCount: 1) ──────────────────

registerTemplate({
  id: 'OTHER_INFECTED',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return a.infected; },
  render(speaker, [a])         { return `${a.name} is infected.`; }
});

registerTemplate({
  id: 'OTHER_NOT_INFECTED',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return !a.infected; },
  render(speaker, [a])         { return `${a.name} is not infected.`; }
});

registerTemplate({
  id: 'OTHER_TRUTHFUL',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return a.truthful; },
  render(speaker, [a])         { return `${a.name} is telling the truth.`; }
});

registerTemplate({
  id: 'OTHER_LYING',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return !a.truthful; },
  render(speaker, [a])         { return `${a.name} is lying.`; }
});

registerTemplate({
  id: 'OTHER_INFECTED_AND_LYING',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return a.infected && !a.truthful; },
  render(speaker, [a])         { return `${a.name} is infected and lying.`; }
});

registerTemplate({
  id: 'OTHER_INFECTED_AND_TRUTHFUL',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return a.infected && a.truthful; },
  render(speaker, [a])         { return `${a.name} is infected and telling the truth.`; }
});

registerTemplate({
  id: 'OTHER_CLEAN_AND_LYING',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return !a.infected && !a.truthful; },
  render(speaker, [a])         { return `${a.name} is not infected but is lying.`; }
});

registerTemplate({
  id: 'OTHER_CLEAN_AND_TRUTHFUL',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return !a.infected && a.truthful; },
  render(speaker, [a])         { return `${a.name} is not infected and is telling the truth.`; }
});

registerTemplate({
  id: 'SELF_AND_OTHER_BOTH_INFECTED',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return speaker.infected && a.infected; },
  render(speaker, [a])         { return `${a.name} and I are both infected.`; }
});

registerTemplate({
  id: 'SELF_CLEAN_OTHER_INFECTED',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return !speaker.infected && a.infected; },
  render(speaker, [a])         { return `I am not infected, but ${a.name} is.`; }
});

registerTemplate({
  id: 'SELF_AND_OTHER_SAME_INFECTION',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return speaker.infected === a.infected; },
  render(speaker, [a])         { return `${a.name} and I have the same infection status.`; }
});

registerTemplate({
  id: 'SELF_AND_OTHER_DIFF_INFECTION',
  paramCount: 1,
  evaluate(crew, speaker, [a]) { return speaker.infected !== a.infected; },
  render(speaker, [a])         { return `${a.name} and I have different infection statuses.`; }
});

// ── Two other crew members (paramCount: 2) ─────────────────

registerTemplate({
  id: 'BOTH_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected && b.infected; },
  render(speaker, [a, b])         { return `${a.name} and ${b.name} are both infected.`; }
});

registerTemplate({
  id: 'NEITHER_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return !a.infected && !b.infected; },
  render(speaker, [a, b])         { return `Neither ${a.name} nor ${b.name} is infected.`; }
});

registerTemplate({
  id: 'EXACTLY_ONE_OF_TWO_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected !== b.infected; },
  render(speaker, [a, b])         { return `Exactly one of ${a.name} and ${b.name} is infected.`; }
});

registerTemplate({
  id: 'AT_LEAST_ONE_OF_TWO_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected || b.infected; },
  render(speaker, [a, b])         { return `${a.name} or ${b.name} is infected (or both).`; }
});

registerTemplate({
  id: 'BOTH_TRUTHFUL',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.truthful && b.truthful; },
  render(speaker, [a, b])         { return `${a.name} and ${b.name} are both telling the truth.`; }
});

registerTemplate({
  id: 'BOTH_LYING',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return !a.truthful && !b.truthful; },
  render(speaker, [a, b])         { return `${a.name} and ${b.name} are both lying.`; }
});

registerTemplate({
  id: 'EXACTLY_ONE_OF_TWO_LYING',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.truthful !== b.truthful; },
  render(speaker, [a, b])         { return `Exactly one of ${a.name} and ${b.name} is lying.`; }
});

registerTemplate({
  id: 'SAME_INFECTION_STATUS',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected === b.infected; },
  render(speaker, [a, b])         { return `${a.name} and ${b.name} have the same infection status.`; }
});

registerTemplate({
  id: 'DIFFERENT_INFECTION_STATUS',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected !== b.infected; },
  render(speaker, [a, b])         { return `${a.name} and ${b.name} have different infection statuses.`; }
});

registerTemplate({
  // Logical conditional: ¬A.infected ∨ B.truthful
  id: 'IF_A_INFECTED_THEN_B_TRUTHFUL',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return !a.infected || b.truthful; },
  render(speaker, [a, b])         { return `If ${a.name} is infected, then ${b.name} is telling the truth.`; }
});

registerTemplate({
  id: 'IF_A_TRUTHFUL_THEN_B_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return !a.truthful || b.infected; },
  render(speaker, [a, b])         { return `If ${a.name} is telling the truth, then ${b.name} is infected.`; }
});

registerTemplate({
  id: 'IF_A_TRUTHFUL_THEN_B_NOT_INFECTED',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return !a.truthful || !b.infected; },
  render(speaker, [a, b])         { return `If ${a.name} is telling the truth, then ${b.name} is not infected.`; }
});

registerTemplate({
  id: 'A_INFECTED_OR_B_TRUTHFUL',
  paramCount: 2,
  evaluate(crew, speaker, [a, b]) { return a.infected || b.truthful; },
  render(speaker, [a, b])         { return `${a.name} is infected or ${b.name} is telling the truth (or both).`; }
});

// ── Global count (paramCount: 0) ───────────────────────────
// These use the full crew array for aggregate queries.

registerTemplate({
  id: 'MORE_INFECTED_THAN_LIARS',
  paramCount: 0,
  evaluate(crew, speaker, params) {
    const infected = crew.filter(c => c.infected).length;
    const liars    = crew.filter(c => !c.truthful).length;
    return infected > liars;
  },
  render(speaker, params) { return 'There are more infected crew than liars.'; }
});

registerTemplate({
  id: 'MORE_LIARS_THAN_INFECTED',
  paramCount: 0,
  evaluate(crew, speaker, params) {
    const infected = crew.filter(c => c.infected).length;
    const liars    = crew.filter(c => !c.truthful).length;
    return liars > infected;
  },
  render(speaker, params) { return 'There are more liars than infected crew.'; }
});

registerTemplate({
  id: 'INFECTED_EQUALS_LIARS',
  paramCount: 0,
  evaluate(crew, speaker, params) {
    const infected = crew.filter(c => c.infected).length;
    const liars    = crew.filter(c => !c.truthful).length;
    return infected === liars;
  },
  render(speaker, params) { return 'The number of infected equals the number of liars.'; }
});

// ============================================================
// 4. NAME + COLOR POOLS
// ============================================================

const NAME_POOL = [
  'Organ', 'Ice', 'Ploy', 'Chaki', 'Peach',
  'Sweet', 'Mai', 'Paint', 'Joy', 'Owen',
  'AP'
];

const AVATAR_COLORS = [
  '#00aaff', '#ff6622', '#22e87a', '#ff22aa',
  '#ffcc00', '#aa44ff', '#00e0cc', '#ff4444'
];

// ============================================================
// 5. WORLD GENERATOR
// ============================================================

function generateWorld() {
  const crewSize      = randomInt(4, 7);
  const names         = shuffle(NAME_POOL).slice(0, crewSize);

  // At least 1 infected; at most half the crew (keeps puzzle solvable)
  const infectedCount = randomInt(1, Math.max(1, Math.floor(crewSize / 2)));

  // At least 1 liar and 1 truthteller
  const liarCount     = randomInt(1, crewSize - 1);
  const truthfulCount = crewSize - liarCount;

  // Assign flags
  const idxShuffled   = shuffle([...Array(crewSize).keys()]);
  const infectedIds   = new Set(idxShuffled.slice(0, infectedCount));
  const truthfulShuf  = shuffle([...Array(crewSize).keys()]);
  const truthfulIds   = new Set(truthfulShuf.slice(0, truthfulCount));

  const crew = names.map((name, i) => ({
    id:       i,
    name,
    infected: infectedIds.has(i),
    truthful: truthfulIds.has(i),
    color:    AVATAR_COLORS[i % AVATAR_COLORS.length],
    statement: null   // filled by assignStatements
  }));

  return { crew, infectedCount, truthfulCount, liarCount };
}

// ============================================================
// 6. STATEMENT ASSIGNER
// ============================================================

const MAX_STMT_ATTEMPTS = 300;

/**
 * Try to assign a valid statement to every crew member.
 * Returns true on success, false if any member couldn't be assigned.
 */
function assignStatements(world) {
  const { crew } = world;
  const usedKeys  = new Set();   // prevents duplicate (templateId + paramIds)

  for (const member of crew) {
    let assigned = false;

    for (let attempt = 0; attempt < MAX_STMT_ATTEMPTS; attempt++) {
      const template = pick(TemplateRegistry);
      const params   = pickParams(template, member, crew);
      if (params === null) continue;

      // Does the statement evaluate to the right truth value?
      const value    = template.evaluate(crew, member, params);
      const correct  = member.truthful ? value === true : value === false;
      if (!correct) continue;

      // No duplicate template + param combination
      const key = template.id + ':' + params.map(p => p.id).join(',');
      if (usedKeys.has(key)) continue;

      usedKeys.add(key);
      member.statement = {
        templateId: template.id,
        paramIds:   params.map(p => p.id),
        rendered:   template.render(member, params)
      };
      assigned = true;
      break;
    }

    if (!assigned) return false;
  }

  return true;
}

/** Pick distinct crew members for template params (never the speaker). */
function pickParams(template, speaker, crew) {
  if (template.paramCount === 0) return [];

  const others = crew.filter(c => c.id !== speaker.id);

  if (template.paramCount === 1) {
    if (others.length < 1) return null;
    return [pick(others)];
  }

  if (template.paramCount === 2) {
    if (others.length < 2) return null;
    const s = shuffle(others);
    return [s[0], s[1]];        // guaranteed distinct
  }

  return null;
}

// ============================================================
// 7. PUZZLE VALIDATOR
// ============================================================

/**
 * Brute-force check: enumerate every possible (infectedSet, truthfulSet)
 * with the correct counts and verify statement consistency.
 *
 * Returns { valid: bool, solutionCount: number }
 * Stops counting after 2 solutions (fast short-circuit).
 */
function validatePuzzle(world) {
  const { crew, infectedCount, truthfulCount } = world;

  const infCombos  = combinations(crew, infectedCount);
  const truCombos  = combinations(crew, truthfulCount);

  let solutionCount = 0;

  outer:
  for (const infSet of infCombos) {
    const infIds = new Set(infSet.map(c => c.id));

    for (const truSet of truCombos) {
      const truIds = new Set(truSet.map(c => c.id));

      // Build candidate world snapshot
      const snapshot = crew.map(c => ({
        ...c,
        infected: infIds.has(c.id),
        truthful: truIds.has(c.id)
      }));

      // Check every statement against this snapshot
      let valid = true;
      for (const member of snapshot) {
        const stmt = member.statement;
        if (!stmt) { valid = false; break; }

        const template = findTemplate(stmt.templateId);
        if (!template) { valid = false; break; }

        const params    = stmt.paramIds.map(id => snapshot.find(c => c.id === id));
        const evaluated = template.evaluate(snapshot, member, params);
        const consistent = member.truthful ? evaluated === true : evaluated === false;

        if (!consistent) { valid = false; break; }
      }

      if (valid) {
        solutionCount++;
        if (solutionCount > 1) break outer;   // more than one → invalid
      }
    }
  }

  return { valid: solutionCount === 1, solutionCount };
}

// ============================================================
// 8. GAME CONTROLLER
// ============================================================

const MAX_GAME_ATTEMPTS  = 800;
const YIELD_EVERY        = 20;    // yield to UI thread every N attempts

let currentGame      = null;
let playerSelection  = new Set(); // crew IDs the player marked as infected
let gameOver         = false;

async function generateGame() {
  for (let attempt = 1; attempt <= MAX_GAME_ATTEMPTS; attempt++) {
    // Yield to UI occasionally so the spinner stays smooth
    if (attempt % YIELD_EVERY === 0) {
      setLoadingText(`SCANNING CREW… (${attempt})`);
      await sleep(0);
    }

    const world   = generateWorld();
    const ok      = assignStatements(world);
    if (!ok) continue;

    const result  = validatePuzzle(world);
    if (result.valid) return world;
  }
  return null;
}

async function startNewGame() {
  gameOver        = false;
  playerSelection = new Set();

  showLoading(true);
  hideResult();
  clearCrewList();

  const game = await generateGame();

  showLoading(false);

  if (!game) {
    showError('Could not generate a unique puzzle. Please try again.');
    return;
  }

  currentGame = game;
  renderGame(game);
}

function checkSolution() {
  if (!currentGame || gameOver) return;

  const { crew, infectedCount } = currentGame;

  // Validate count before evaluating
  if (playerSelection.size !== infectedCount) {
    flashHint(`Select exactly ${infectedCount} infected crew member${infectedCount !== 1 ? 's' : ''}.`);
    return;
  }

  const actualInfected = new Set(crew.filter(c => c.infected).map(c => c.id));
  const correct        =
    [...actualInfected].every(id => playerSelection.has(id)) &&
    [...playerSelection].every(id => actualInfected.has(id));

  gameOver = true;
  revealSolution(crew, actualInfected);

  if (correct) {
    showResult(true, 'MISSION COMPLETE', 'All infected crew identified. The ship is safe.');
  } else {
    showResult(false, 'MISSION FAILED', 'Incorrect report. The infection has spread.');
  }
}

// ============================================================
// 9. UI CONTROLLER
// ============================================================

function renderGame(game) {
  const { crew, infectedCount, truthfulCount, liarCount } = game;

  // Info panel
  setText('crew-count',     crew.length);
  setText('infected-count', infectedCount);
  setText('truthful-count', truthfulCount);
  setText('liar-count',     liarCount);
  setText('hint-infected',  infectedCount);
  show('game-info');

  // Crew cards
  const list = document.getElementById('crew-list');
  list.innerHTML = '';
  for (const member of crew) {
    list.appendChild(buildCrewCard(member));
  }

  show('controls');
  document.getElementById('submit-btn').disabled = false;
}

function buildCrewCard(member) {
  const card       = document.createElement('div');
  card.className   = 'crew-card';
  card.id          = `card-${member.id}`;

  const color      = member.color;
  const initial    = member.name[0];
  const stmtHtml   = escHtml(member.statement.rendered);

  card.innerHTML = `
    <div class="card-header">
      <div class="crew-avatar" style="
        color: ${color};
        border-color: ${color};
        background: ${color}18;
      ">${initial}</div>
      <div class="crew-name">${member.name}</div>
      <button
        class="infect-btn"
        id="btn-${member.id}"
        onclick="toggleInfected(${member.id})"
      >CLEAR</button>
    </div>
    <div class="card-statement">
      <span class="stmt-label">STATEMENT</span>
      <span class="stmt-text">${stmtHtml}</span>
    </div>
  `;

  return card;
}

function toggleInfected(id) {
  if (gameOver) return;

  if (playerSelection.has(id)) {
    playerSelection.delete(id);
  } else {
    playerSelection.add(id);
  }

  refreshCardState(id);
}

function refreshCardState(id) {
  const card = document.getElementById(`card-${id}`);
  const btn  = document.getElementById(`btn-${id}`);
  if (!card || !btn) return;

  if (playerSelection.has(id)) {
    card.classList.add('selected');
    btn.classList.add('active');
    btn.textContent = 'INFECTED';
  } else {
    card.classList.remove('selected');
    btn.classList.remove('active');
    btn.textContent = 'CLEAR';
  }
}

function revealSolution(crew, actualInfected) {
  for (const member of crew) {
    const card = document.getElementById(`card-${member.id}`);
    const btn  = document.getElementById(`btn-${member.id}`);
    if (!card || !btn) continue;

    // Remove interactive state
    card.classList.remove('selected');
    btn.disabled = true;

    const wasMarked   = playerSelection.has(member.id);
    const isInfected  = actualInfected.has(member.id);

    if (isInfected && wasMarked) {
      card.classList.add('reveal-correct');
    } else if (isInfected && !wasMarked) {
      card.classList.add('reveal-missed');
    } else if (!isInfected && wasMarked) {
      card.classList.add('reveal-false-acc');
    } else {
      card.classList.add('reveal-clean');
    }

    // Append truth + infection badges
    const badges = document.createElement('div');
    badges.className = 'reveal-badges';

    const infBadge  = document.createElement('span');
    infBadge.className = isInfected ? 'badge badge-infected' : 'badge badge-clean';
    infBadge.textContent = isInfected ? 'INFECTED' : 'CLEAN';

    const truBadge  = document.createElement('span');
    truBadge.className = member.truthful ? 'badge badge-truthful' : 'badge badge-liar';
    truBadge.textContent = member.truthful ? 'TRUTHFUL' : 'LIAR';

    badges.appendChild(infBadge);
    badges.appendChild(truBadge);
    card.querySelector('.card-statement').appendChild(badges);
  }

  // Disable submit button
  document.getElementById('submit-btn').disabled = true;
}

function showResult(success, title, message) {
  const el    = document.getElementById('result');
  el.className = success ? 'result-success' : 'result-failure';
  el.innerHTML = `
    <div class="result-icon">${success ? '✓' : '✗'}</div>
    <div class="result-title">${title}</div>
    <div class="result-msg">${message}</div>
  `;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
  document.getElementById('result').classList.add('hidden');
}

function flashHint(msg) {
  const el    = document.getElementById('result');
  el.className = 'result-failure';
  el.innerHTML = `<div class="result-msg">${escHtml(msg)}</div>`;
  el.classList.remove('hidden');
}

function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

function setLoadingText(t) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = t;
}

function clearCrewList() {
  document.getElementById('crew-list').innerHTML = '';
}

function showError(msg) {
  document.getElementById('crew-list').innerHTML =
    `<p style="text-align:center;color:var(--danger);padding:20px;">${escHtml(msg)}</p>`;
  show('controls');
}

function show(id)     { document.getElementById(id).classList.remove('hidden'); }
function setText(id, v) { document.getElementById(id).textContent = v; }
function sleep(ms)    { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ============================================================
// 10. STAR FIELD BACKGROUND
// ============================================================

function initStars() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');

  let stars = [];

  function generateStars(w, h) {
    stars = [];
    const count = Math.floor((w * h) / 5000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x:  Math.random() * w,
        y:  Math.random() * h,
        r:  Math.random() * 1.4 + 0.2,
        a:  Math.random() * 0.7 + 0.15
      });
    }
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep space gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#030d18');
    grad.addColorStop(1, '#010408');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 230, 255, ${s.a})`;
      ctx.fill();
    }

    // Subtle nebula glow in the top-left
    const neb = ctx.createRadialGradient(w * 0.15, h * 0.2, 0, w * 0.15, h * 0.2, w * 0.4);
    neb.addColorStop(0, 'rgba(0, 80, 160, 0.06)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars(canvas.width, canvas.height);
    draw();
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
}

// ============================================================
// 11. BOOT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initStars();
  startNewGame();
});
