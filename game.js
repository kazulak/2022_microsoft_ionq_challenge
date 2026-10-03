/* QuanTris — rendering and input. Game rules live in quantum.js. */
'use strict';

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const CELL = 35;
const W = COLS * CELL, H = ROWS * CELL;
const dpr = window.devicePixelRatio || 1;

// Backing store at device resolution; the CSS size stays w x h.
function makeCanvas(canvas, w, h) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    return c;
}

const boardCanvas = document.getElementById('game-canvas');
const ctx = makeCanvas(boardCanvas, W, H); // CSS size set in style.css
// Grid + settled blocks are redrawn only when they change.
const staticLayer = document.createElement('canvas');
const sctx = makeCanvas(staticLayer, W, H);

function drawArrow(c, x1, y1, x2, y2, color, diagonal) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = c.fillStyle = color;
    c.lineWidth = 4.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - 12 * Math.cos(angle - Math.PI / 6), y2 - 12 * Math.sin(angle - Math.PI / 6));
    c.lineTo(x2 - 12 * Math.cos(angle + Math.PI / 6), y2 - 12 * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fill();
    if (diagonal) { // superposition marker, as in the original Hadamard arrow
        c.beginPath();
        c.arc((x1 + x2) / 2, (y1 + y2) / 2, 4.5, 0, 2 * Math.PI);
        c.fill();
    }
}

// Draw a block whose anchor cell is centred at (cx, cy), with cells `size` px wide.
function drawBlock(c, stateId, cx, cy, size, { active = false, time = 0 } = {}) {
    const st = STATES[stateId];
    const pad = size * 0.06;
    const colorOf = i => (st.entangled ? ENTANGLED_COLOR : DIR_COLOR[st.cellDirs[i]]);

    c.save();
    st.cells.forEach(([dx, dy], i) => {
        c.fillStyle = st.entangled ? ENTANGLED_FILL : DIR_FILL[st.cellDirs[i]];
        c.strokeStyle = colorOf(i);
        c.lineWidth = active ? 2.5 : 1.5;
        c.beginPath();
        c.roundRect(cx + (dx - 0.5) * size + pad, cy - (dy + 0.5) * size + pad, size - 2 * pad, size - 2 * pad, size * 0.17);
        c.fill();
        c.stroke();
    });

    if (st.qubits === 2) { // bridge between the two qubits
        const x2 = cx + 2 * size;
        c.strokeStyle = st.entangled ? 'rgba(155, 93, 229, 0.9)' : 'rgba(155, 93, 229, 0.45)';
        c.lineWidth = st.entangled ? 5 : 3;
        c.setLineDash([6, 6]);
        if (active) c.lineDashOffset = -(time / 35) % 24;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(x2, cy);
        c.stroke();
        c.setLineDash([]);
    }

    for (const { at, dir } of st.arrows) {
        const [dx, dy] = DIRS[dir];
        const x1 = cx + at * size;
        drawArrow(c, x1, cy, x1 + dx * size, cy - dy * size, DIR_COLOR[dir], dir % 2 === 1);
    }

    // Qubit centres, on top of the arrows. For 2-qubit blocks they carry the
    // sign of the state: the only visible difference from its negation.
    const r = size * (st.qubits === 2 ? 0.27 : 0.2);
    c.font = `800 ${Math.round(size * 0.42)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const q of st.qubits === 2 ? [0, 2] : [0]) {
        c.fillStyle = st.entangled ? ENTANGLED_COLOR : DIR_COLOR[st.cellDirs[q]];
        c.beginPath();
        c.arc(cx + q * size, cy, r, 0, 2 * Math.PI);
        c.fill();
        if (st.qubits === 2) {
            c.fillStyle = '#05070f';
            c.fillText(st.sign > 0 ? '+' : '−', cx + q * size, cy + size * 0.03);
        }
    }
    c.restore();
}

const cellCenter = (x, y) => [x * CELL + CELL / 2, (ROWS - 1 - y) * CELL + CELL / 2];

function drawStatic(game) {
    sctx.fillStyle = '#020408';
    sctx.fillRect(0, 0, W, H);
    sctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    sctx.lineWidth = 1;
    sctx.beginPath();
    for (let x = 0; x <= COLS; x++) { sctx.moveTo(x * CELL, 0); sctx.lineTo(x * CELL, H); }
    for (let y = 0; y <= ROWS; y++) { sctx.moveTo(0, y * CELL); sctx.lineTo(W, y * CELL); }
    sctx.stroke();
    if (!game) return;
    for (const b of game.settled) drawBlock(sctx, b.state, ...cellCenter(b.x, b.y), CELL);
}

function drawGhost(game) {
    const g = { ...game.active, y: game.ghostY() };
    const st = STATES[g.state];
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    cellsOf(g).forEach(([x, y], i) => {
        ctx.strokeStyle = st.entangled ? ENTANGLED_COLOR : DIR_COLOR[st.cellDirs[i]];
        ctx.beginPath();
        ctx.roundRect(x * CELL + 2, (ROWS - 1 - y) * CELL + 2, CELL - 4, CELL - 4, 6);
        ctx.stroke();
    });
    ctx.restore();
}

function drawTargetHalo(game, time) {
    const { state, x, y } = game.active;
    if (STATES[state].qubits !== 2) return;
    const [cx, cy] = cellCenter(x + (game.target === 1 ? 0 : 2), y);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + Math.sin(time / 120) * 1.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

let drawnBoardVersion = -1;
function render(time) {
    if (!game || game.boardVersion !== drawnBoardVersion) {
        drawStatic(game);
        drawnBoardVersion = game ? game.boardVersion : -1;
    }
    ctx.drawImage(staticLayer, 0, 0, W, H);
    if (!game || game.over) return;
    drawGhost(game);
    const { state, x, y } = game.active;
    drawBlock(ctx, state, ...cellCenter(x, y), CELL, { active: true, time });
    drawTargetHalo(game, time);
}

// Upcoming-block previews: fixed canvases, redrawn only when the queue changes.
const PREVIEW_W = 120, PREVIEW_H = 70, PREVIEW_CELL = 22;
const previews = [1, 2, 3].map(i => {
    const canvas = document.createElement('canvas');
    canvas.style.width = `${PREVIEW_W}px`;
    canvas.style.height = `${PREVIEW_H}px`;
    document.getElementById(`upcoming-${i}`).appendChild(canvas);
    return makeCanvas(canvas, PREVIEW_W, PREVIEW_H);
});

function renderPreviews() {
    previews.forEach((c, i) => {
        c.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
        const id = game && game.queue[i];
        if (id === undefined) return;
        const st = STATES[id];
        const minDy = Math.min(...st.cells.map(cell => cell[1]));
        // centre the shape's bounding box
        const cx = PREVIEW_W / 2 - ((st.minDx + st.maxDx) / 2) * PREVIEW_CELL;
        const cy = PREVIEW_H / 2 + ((minDy + st.maxDy) / 2) * PREVIEW_CELL;
        drawBlock(c, id, cx, cy, PREVIEW_CELL);
    });
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);

function loadHighscore() {
    try { return Number(localStorage.getItem('quantris_highscore')) || 0; } catch { return 0; }
}
function saveHighscore(v) {
    try { localStorage.setItem('quantris_highscore', String(v)); } catch { /* storage unavailable */ }
}

let game = null;
let speed = DEFAULT_SPEED;
let highscore = loadHighscore();
let lastStep = 0;
let loopId = null;
let shownSpawn = -1;

function updateHud() {
    $('score-val').textContent = game ? game.points : 0;
    if (game && game.points > highscore) {
        highscore = game.points;
        saveHighscore(highscore);
    }
    $('high-score-val').textContent = highscore;
    $('difficulty-val').textContent = (1 / SPEEDS[speed]).toFixed(2);
    $('diff-minus').disabled = speed === 0;
    $('diff-plus').disabled = speed === SPEEDS.length - 1;

    const twoQubits = !!game && !game.over && STATES[game.active.state].qubits === 2;
    for (const id of ['gate-cx', 'gate-cz']) $(id).disabled = !twoQubits;
    $('qubit-selector-container').style.display = twoQubits ? 'flex' : 'none';
    $('sel-qubit-1').classList.toggle('active', twoQubits && game.target === 1);
    $('sel-qubit-2').classList.toggle('active', twoQubits && game.target === 2);

    if (game && game.spawnCount !== shownSpawn) {
        shownSpawn = game.spawnCount;
        renderPreviews();
    }
}

// Run a game action, then refresh everything that depends on it.
function act(fn) {
    if (!game || game.over) return;
    fn(game);
    updateHud();
    if (game.over) showGameOver();
}

function frame(time) {
    if (!lastStep) lastStep = time;
    if (time - lastStep >= SPEEDS[speed] * 1000) {
        lastStep = time;
        act(g => g.step());
    }
    render(time);
    if (game && !game.over) loopId = requestAnimationFrame(frame);
}

function startGame() {
    if (loopId) cancelAnimationFrame(loopId);
    game = new Game();
    shownSpawn = -1;
    lastStep = 0;
    $('game-overlay').classList.add('hidden');
    updateHud();
    if (game.over) return showGameOver();
    loopId = requestAnimationFrame(frame);
}

function showGameOver() {
    cancelAnimationFrame(loopId);
    loopId = null;
    render(performance.now());
    $('overlay-title').textContent = 'Game Over';
    $('overlay-desc').textContent = `You scored ${game.points} points! Ready to try again?`;
    $('btn-start').textContent = 'Play Again';
    $('game-overlay').classList.remove('hidden');
}

function setTarget(q) {
    act(g => { g.target = q; });
}

// Buttons: blur after click so Space/Enter don't silently repeat the last one.
function onClick(id, fn) {
    $(id).addEventListener('click', e => {
        e.currentTarget.blur();
        fn();
    });
}

onClick('btn-start', startGame);
onClick('diff-minus', () => { speed = Math.max(0, speed - 1); updateHud(); });
onClick('diff-plus', () => { speed = Math.min(SPEEDS.length - 1, speed + 1); updateHud(); });
onClick('sel-qubit-1', () => setTarget(1));
onClick('sel-qubit-2', () => setTarget(2));
for (const btn of document.querySelectorAll('.gate-btn')) {
    onClick(btn.id, () => act(g => g.applyGate(btn.dataset.gate)));
}
for (const btn of document.querySelectorAll('.move-btn')) {
    const move = btn.dataset.move;
    onClick(btn.id, () => act(g => (move === 'down' ? g.step() : g.move(move === 'left' ? -1 : 1))));
}

const KEYS = {
    ArrowLeft: g => g.move(-1),
    ArrowRight: g => g.move(1),
    ArrowDown: g => g.step(),
    x: g => g.applyGate('x'),
    z: g => g.applyGate('z'),
    h: g => g.applyGate('h'),
    s: g => g.applyGate('cx'),
    a: g => g.applyGate('cz'),
    q: g => { g.target = 3 - g.target; },
    Tab: g => { g.target = 3 - g.target; },
};

window.addEventListener('keydown', e => {
    if (!game || game.over || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const handler = KEYS[key];
    if (!handler) return;
    e.preventDefault();
    if (e.repeat && !key.startsWith('Arrow')) return; // holding X shouldn't toggle it back and forth
    act(handler);
});

// How-to-play modal
const modal = $('how-to-modal');
onClick('btn-how-to', () => modal.classList.add('active'));
onClick('modal-close', () => modal.classList.remove('active'));
modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('active');
});

updateHud();
render(0);
