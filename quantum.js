/* QuanTris — quantum state tables and game rules (no DOM).
 *
 * Every block is in one of a small, finite set of quantum states (8 one-qubit,
 * 48 two-qubit). All the physics — gate transitions, negation, which cells a
 * state covers, how it is drawn — is computed once at load into the STATES
 * table. The game itself only does integer table lookups: no floating point,
 * no repeated state-vector math.
 */
'use strict';

// ---------------------------------------------------------------------------
// Exact quantum states
// ---------------------------------------------------------------------------
// A state is a vector of small integers with implicit normalisation: every
// reachable state has equal-magnitude non-zero amplitudes, so dividing by the
// gcd gives a canonical form with entries in {-1, 0, 1}.
//   1 qubit:  [a0, a1]               (|0>, |1>)
//   2 qubits: [a00, a01, a10, a11]   (qubit 1 = left = most significant)
// The gates used (X, Z, H, CX, CZ) map that set to itself. CH does not
// (it produces unequal magnitudes), which is why it is not in the game.

const GATE_1Q = {
    x: ([a, b]) => [b, a],
    z: ([a, b]) => [a, -b],
    h: ([a, b]) => [a + b, a - b], // the 1/sqrt2 is absorbed by normalisation
};

function onQubit(gate, qubit) {
    const pairs = qubit === 1 ? [[0, 2], [1, 3]] : [[0, 1], [2, 3]];
    return v => {
        const r = v.slice();
        for (const [i, j] of pairs) [r[i], r[j]] = gate([v[i], v[j]]);
        return r;
    };
}

const GATE_2Q = {
    x1: onQubit(GATE_1Q.x, 1), x2: onQubit(GATE_1Q.x, 2),
    z1: onQubit(GATE_1Q.z, 1), z2: onQubit(GATE_1Q.z, 2),
    h1: onQubit(GATE_1Q.h, 1), h2: onQubit(GATE_1Q.h, 2),
    cx: ([a, b, c, d]) => [a, b, d, c],
    cz: ([a, b, c, d]) => [a, b, c, -d],
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function normalise(v) {
    const g = v.reduce((acc, x) => gcd(acc, Math.abs(x)), 0);
    const r = v.map(x => x / g + 0); // "+ 0" turns -0 into 0
    if (r.some(x => Math.abs(x) > 1)) throw new Error(`Not an equal-magnitude state: ${v}`);
    return r;
}

// The 8 arrow directions, counter-clockwise from |0> (right). Index i is
// i * 45 degrees. A one-qubit state vector *is* its arrow.
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const dirIndex = ([x, y]) => DIRS.findIndex(d => d[0] === x && d[1] === y);

// Hue per direction: |0> cyan, |+> blue, |1> violet, ... -|0> red, ...
const DIR_COLOR = DIRS.map((_, i) => `hsl(${(i * 45 + 180) % 360}, 80%, 55%)`);
const DIR_FILL = DIRS.map((_, i) => `hsla(${(i * 45 + 180) % 360}, 80%, 55%, 0.14)`);
const ENTANGLED_COLOR = '#b48cf0';
const ENTANGLED_FILL = 'rgba(155, 93, 229, 0.16)';

// One representative of each +/- pair (first component positive).
const HALF_DIRS = [[1, 0], [1, 1], [0, 1], [1, -1]];
const kron = (a, b) => [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]];
const sameVec = (a, b) => a.every((x, i) => x === b[i]);

// Geometry of a state. Cells are offsets from the block's anchor (the first
// qubit's centre); each arrow starts at a qubit centre.
//  - 1 qubit: centre + the cell its arrow points to. The state vector *is* the
//    arrow, so a minus sign turns it around; the shape (a domino) is the same.
//  - 2 qubits: the shape must also be the same for a state and its negation,
//    or some blocks could never be cleared. So the shape depends only on the
//    state up to sign, and the sign is drawn separately as a +/- badge.
//    Product state s*(a ⊗ b): arrows a and b, qubit 2 two cells right.
//    Entangled state: neither qubit has a direction of its own, so no arrows;
//    the block covers just the two centres.
function geometry(v) {
    if (v.length === 2) {
        const d = dirIndex(v);
        return { cells: [[0, 0], v], cellDirs: [d, d], arrows: [{ at: 0, dir: d }], entangled: false };
    }
    const sign = Math.sign(v.find(x => x !== 0)); // canonical: first amplitude positive
    const pos = v.map(x => sign * x);
    for (const a of HALF_DIRS) {
        for (const b of HALF_DIRS) {
            if (!sameVec(normalise(kron(a, b)), pos)) continue;
            const ia = dirIndex(a), ib = dirIndex(b);
            return {
                cells: [[0, 0], a, [2, 0], [2 + b[0], b[1]]],
                cellDirs: [ia, ia, ib, ib],
                arrows: [{ at: 0, dir: ia }, { at: 2, dir: ib }],
                entangled: false,
                sign,
            };
        }
    }
    return { cells: [[0, 0], [2, 0]], cellDirs: [-1, -1], arrows: [], entangled: true, sign };
}

// Breadth-first search over everything reachable from the spawn states.
function buildStates() {
    const states = [];
    const index = new Map();
    const intern = v => {
        v = normalise(v);
        const key = v.join();
        if (!index.has(key)) {
            index.set(key, states.length);
            states.push({ vec: v, qubits: v.length === 2 ? 1 : 2 });
        }
        return index.get(key);
    };

    const spawn1 = DIRS.map(intern);
    const spawn2 = [];
    for (const i of [0, 1, 2, 3]) {
        for (const s of [1, -1]) {
            const v = [0, 0, 0, 0];
            v[i] = s;
            spawn2.push(intern(v)); // +/-|00>, +/-|01>, +/-|10>, +/-|11>
        }
    }

    for (let id = 0; id < states.length; id++) { // states grows while we walk it
        const st = states[id];
        const gates = st.qubits === 1 ? GATE_1Q : GATE_2Q;
        st.next = {};
        for (const [name, gate] of Object.entries(gates)) st.next[name] = intern(gate(st.vec));
    }

    for (const st of states) {
        st.neg = index.get(st.vec.map(x => -x + 0).join());
        Object.assign(st, geometry(st.vec));
        const dxs = st.cells.map(c => c[0]), dys = st.cells.map(c => c[1]);
        st.minDx = Math.min(...dxs);
        st.maxDx = Math.max(...dxs);
        st.maxDy = Math.max(...dys);
    }
    return { states, spawn1, spawn2 };
}

const { states: STATES, spawn1: SPAWN_1Q, spawn2: SPAWN_2Q } = buildStates();

// ---------------------------------------------------------------------------
// Game rules
// ---------------------------------------------------------------------------
const COLS = 10, ROWS = 20;
const SPAWN_X = 4;
const QUEUE_LENGTH = 5;
const PREFILL_BLOCKS = 9;
const TWO_QUBIT_CHANCE = 0.4;
// Seconds per row. Fixed levels instead of repeatedly adding 0.1 to a float.
const SPEEDS = [2, 1.5, 1.2, 1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1];
const DEFAULT_SPEED = SPEEDS.indexOf(0.7);

const randInt = n => Math.floor(Math.random() * n);
const randomState = () =>
    Math.random() < TWO_QUBIT_CHANCE ? SPAWN_2Q[randInt(SPAWN_2Q.length)] : SPAWN_1Q[randInt(SPAWN_1Q.length)];

// A block is { state, x, y }: a STATES index plus the anchor cell.
const cellsOf = b => STATES[b.state].cells.map(([dx, dy]) => [b.x + dx, b.y + dy]);
const inBounds = ([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

class Game {
    constructor() {
        this.settled = [];
        this.grid = new Array(COLS * ROWS).fill(null); // cell -> settled block
        this.queue = Array.from({ length: QUEUE_LENGTH }, randomState);
        this.points = 0;
        this.over = false;
        this.target = 1; // which qubit 1-qubit gates act on, for 2-qubit blocks
        this.boardVersion = 0; // bumped whenever settled blocks change (for render caching)
        this.spawnCount = 0;   // bumped whenever the queue advances
        this.prefill();
        this.spawn();
    }

    occupant([x, y]) {
        return this.grid[y * COLS + x];
    }

    fits(b) {
        return cellsOf(b).every(c => inBounds(c) && !this.occupant(c));
    }

    // The settled block that `b` would cancel with: opposite state, same cells.
    partnerOf(b) {
        const cells = cellsOf(b);
        if (!cells.every(inBounds)) return null;
        const p = this.occupant(cells[0]);
        if (!p || p.state !== STATES[b.state].neg) return null;
        // p has as many distinct cells as b, so if p fills all of b's cells the sets are equal
        return cells.every(c => this.occupant(c) === p) ? p : null;
    }

    setCells(b, value) {
        for (const [x, y] of cellsOf(b)) this.grid[y * COLS + x] = value;
        this.boardVersion++;
    }

    settle(b) {
        this.settled.push(b);
        this.setCells(b, b);
    }

    // Board starts with some blocks already dropped in random columns.
    prefill() {
        for (let i = 0; i < PREFILL_BLOCKS; i++) {
            const state = randomState();
            const st = STATES[state];
            const x = -st.minDx + randInt(COLS - (st.maxDx - st.minDx));
            const b = { state, x, y: ROWS - 1 - st.maxDy };
            if (!this.fits(b)) break;
            while (this.fits({ ...b, y: b.y - 1 })) b.y--;
            this.settle(b);
        }
    }

    spawn() {
        const state = this.queue.shift();
        this.queue.push(randomState());
        this.spawnCount++;
        this.active = { state, x: SPAWN_X, y: ROWS - 1 - STATES[state].maxDy };
        this.target = 1;
        if (!this.fits(this.active)) this.over = true;
    }

    cancel(partner) {
        this.settled.splice(this.settled.indexOf(partner), 1);
        this.setCells(partner, null);
        this.points++;
        this.spawn();
    }

    // Move/transform the active block if the result fits or cancels.
    tryReplace(next) {
        const p = this.partnerOf(next);
        if (p) this.cancel(p);
        else if (this.fits(next)) this.active = next;
    }

    applyGate(gate) {
        if (this.over) return;
        const st = STATES[this.active.state];
        const key = st.qubits === 2 && gate.length === 1 ? gate + this.target : gate;
        const next = st.next[key];
        if (next !== undefined) this.tryReplace({ ...this.active, state: next });
    }

    move(dx) {
        if (this.over) return;
        this.tryReplace({ ...this.active, x: this.active.x + dx });
    }

    // One row of gravity.
    step() {
        if (this.over) return;
        const down = { ...this.active, y: this.active.y - 1 };
        let p = this.partnerOf(down);
        if (p) return this.cancel(p);
        if (this.fits(down)) {
            this.active = down;
            return;
        }
        // Blocked. A shape that sticks up (e.g. an up-arrow) is stopped one row
        // above its partner by the partner itself, so also try one row lower,
        // as long as nothing but that partner is in the way.
        const down2 = { ...this.active, y: this.active.y - 2 };
        p = this.partnerOf(down2);
        if (p && cellsOf(down).every(c => inBounds(c) && [null, p].includes(this.occupant(c)))) {
            return this.cancel(p);
        }
        this.settle(this.active);
        this.spawn();
    }

    ghostY() {
        const g = { ...this.active };
        while (this.fits({ ...g, y: g.y - 1 })) g.y--;
        return g.y;
    }
}
