/* Quantum Tetris Game Logic */

// Math Constants and Helpers
const sqrt2 = Math.sqrt(2);

function rotate45(v) {
    return [(v[0] - v[1]) / sqrt2, (v[0] + v[1]) / sqrt2];
}

function rotate90(v) {
    return [-v[1], v[0]];
}

function kron(v1, v2) {
    const res = [];
    for (let i = 0; i < v1.length; i++) {
        for (let j = 0; j < v2.length; j++) {
            res.push(v1[i] * v2[j]);
        }
    }
    return res;
}

function getOrientation(qubitState) {
    // Returns angle between 0 and 7 representing multiples of 45 degrees
    const angle = Math.atan2(qubitState[1], qubitState[0]);
    let deg = (angle * 180) / Math.PI;
    if (deg < 0) deg += 360;
    // Map to closest 45 degrees
    return Math.round(deg / 45) % 8;
}

function getQubitColor(stateVector) {
    const angle = Math.atan2(stateVector[1], stateVector[0]);
    let deg = (angle * 180) / Math.PI;
    if (deg < 0) deg += 360;
    // Offset by 180 so |0> is cyan
    const hue = (deg + 180) % 360;
    return `hsl(${hue}, 100%, 60%)`;
}

function squaresEqual(sqs1, sqs2) {
    if (sqs1.length !== sqs2.length) return false;
    for (const p1 of sqs1) {
        let found = false;
        for (const p2 of sqs2) {
            if (p1[0] === p2[0] && p1[1] === p2[1]) {
                found = true;
                break;
            }
        }
        if (!found) return false;
    }
    return true;
}

function statesOpposite(v1, v2) {
    if (v1.length !== v2.length) return false;
    for (let i = 0; i < v1.length; i++) {
        if (Math.abs(v1[i] + v2[i]) > 0.05) {
            return false;
        }
    }
    return true;
}

// Block Representation
class Block {
    constructor(numQubits = null, stateVector = null, position = null) {
        if (numQubits === null) {
            this.numQubits = Math.random() < 0.4 ? 2 : 1; // 40% chance of 2 qubits
        } else {
            this.numQubits = numQubits;
        }

        // Spawn position
        this.position = position ? [...position] : [4, 19];

        if (stateVector !== null) {
            this.stateVector = [...stateVector];
        } else {
            if (this.numQubits === 1) {
                // Starts at |0> [1, 0] rotated randomly
                let state = [1, 0];
                const rotations = Math.floor(Math.random() * 8);
                for (let i = 0; i < rotations; i++) {
                    state = rotate45(state);
                }
                this.stateVector = state;
            } else {
                // Starts at |00> [1, 0, 0, 0] rotated randomly in multiples of 90 degrees
                let s1 = [1, 0];
                const r1 = Math.floor(Math.random() * 4);
                for (let i = 0; i < r1; i++) {
                    s1 = rotate90(s1);
                }

                let s2 = [1, 0];
                const r2 = Math.floor(Math.random() * 4);
                for (let i = 0; i < r2; i++) {
                    s2 = rotate90(s2);
                }

                this.stateVector = kron(s1, s2);
            }
        }
    }

    getCoveredSquares() {
        const x = this.position[0];
        const y = this.position[1];

        if (this.numQubits === 1) {
            const q = this.stateVector;
            const arrowDir = [Math.round(q[0]), Math.round(q[1])];
            return [
                [x, y],
                [x + arrowDir[0], y + arrowDir[1]]
            ];
        } else {
            const q1 = [
                this.stateVector[0] + this.stateVector[1],
                this.stateVector[2] + this.stateVector[3]
            ];
            const q2 = [
                this.stateVector[0] + this.stateVector[2],
                this.stateVector[1] + this.stateVector[3]
            ];

            const arrow1Dir = [Math.round(q1[0]), Math.round(q1[1])];
            const arrow2Dir = [Math.round(q2[0]), Math.round(q2[1])];

            return [
                [x, y],
                [x + arrow1Dir[0], y + arrow1Dir[1]],
                [x + 2, y],
                [x + 2 + arrow2Dir[0], y + arrow2Dir[1]]
            ];
        }
    }
}

// Collision Checks
function checkOverlap(blocks) {
    if (blocks.length === 0) return false;
    const currentBlock = blocks[blocks.length - 1];
    const currentSquares = currentBlock.getCoveredSquares();

    // Check boundaries
    for (const sq of currentSquares) {
        if (sq[0] < 0 || sq[0] > 9 || sq[1] < 0 || sq[1] > 19) {
            return true;
        }
    }

    // Check overlap with other blocks
    for (let i = 0; i < blocks.length - 1; i++) {
        const otherSquares = blocks[i].getCoveredSquares();
        for (const sq of currentSquares) {
            for (const oSq of otherSquares) {
                if (sq[0] === oSq[0] && sq[1] === oSq[1]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Interference Removal
function removeInterference(blocks) {
    if (blocks.length === 0) return { blocks, didCancel: false };
    const currentBlock = blocks[blocks.length - 1];
    const currentSquares = currentBlock.getCoveredSquares();

    for (let i = 0; i < blocks.length - 1; i++) {
        const otherBlock = blocks[i];

        if (currentBlock.numQubits !== otherBlock.numQubits) continue;

        const otherSquares = otherBlock.getCoveredSquares();

        if (squaresEqual(currentSquares, otherSquares)) {
            if (statesOpposite(currentBlock.stateVector, otherBlock.stateVector)) {
                // Found cancelling block!
                const newBlocks = [...blocks];
                newBlocks.splice(blocks.length - 1, 1); // remove active
                newBlocks.splice(i, 1); // remove matching stationary
                return { blocks: newBlocks, didCancel: true };
            }
        }
    }
    return { blocks, didCancel: false };
}

// Main Game State class
class GameState {
    constructor() {
        this.blocks = [new Block()];
        this.upcomingBlocks = [];
        this.points = 0;
        this.difficulty = 0.7; // fall interval in seconds (lower is harder)
        this.isGameOver = false;

        // Generate initial pool of upcoming blocks
        const number_of_initial_blocks = 10;
        while (this.upcomingBlocks.length < number_of_initial_blocks) {
            const randX = Math.floor(Math.random() * 5) + 1; // 1 to 5
            this.upcomingBlocks.push(new Block(null, null, [randX, 18]));
        }

        // Pre-populate board
        while (this.blocks.length < number_of_initial_blocks) {
            this.update();
        }
    }

    ensureUpcomingBlocks() {
        while (this.upcomingBlocks.length < 5) {
            this.upcomingBlocks.push(new Block());
        }
    }

    handleGateAction(gate) {
        if (this.isGameOver) return;

        const activeIndex = this.blocks.length - 1;
        const currentBlock = this.blocks[activeIndex];
        const oldState = [...currentBlock.stateVector];
        let newState = [...oldState];
        const numQubits = currentBlock.numQubits;

        if (gate === 'x') {
            if (numQubits === 1) {
                newState = [oldState[1], oldState[0]];
            } else {
                newState = [oldState[2], oldState[3], oldState[0], oldState[1]];
            }
        } else if (gate === 'z') {
            if (numQubits === 1) {
                newState = [oldState[0], -oldState[1]];
            } else {
                newState = [oldState[0], oldState[1], -oldState[2], -oldState[3]];
            }
        } else if (gate === 'h') {
            if (numQubits === 1) {
                newState = [(oldState[0] + oldState[1]) / sqrt2, (oldState[0] - oldState[1]) / sqrt2];
            } else {
                newState = [
                    (oldState[0] + oldState[2]) / sqrt2,
                    (oldState[1] + oldState[3]) / sqrt2,
                    (oldState[0] - oldState[2]) / sqrt2,
                    (oldState[1] - oldState[3]) / sqrt2
                ];
            }
        } else if (gate === 'cx') {
            if (numQubits === 2) {
                newState = [oldState[0], oldState[1], oldState[3], oldState[2]];
            } else {
                return;
            }
        } else if (gate === 'cz') {
            if (numQubits === 2) {
                newState = [oldState[0], oldState[1], oldState[2], -oldState[3]];
            } else {
                return;
            }
        } else if (gate === 'ch') {
            if (numQubits === 2) {
                newState = [
                    oldState[0],
                    oldState[1],
                    (oldState[2] + oldState[3]) / sqrt2,
                    (oldState[2] - oldState[3]) / sqrt2
                ];
            } else {
                return;
            }
        } else if (gate === 'swap') {
            if (numQubits === 2) {
                newState = [oldState[0], oldState[2], oldState[1], oldState[3]];
            } else {
                return;
            }
        }

        const tentativeBlocks = this.blocks.map((b, idx) => {
            if (idx === activeIndex) {
                return new Block(b.numQubits, newState, b.position);
            }
            return b;
        });

        const res = removeInterference(tentativeBlocks);
        if (!checkOverlap(res.blocks)) {
            this.blocks = res.blocks;
            if (res.didCancel) {
                this.points += 1;
                this.blocks.push(this.upcomingBlocks.shift());
                this.ensureUpcomingBlocks();
            }
        }
    }

    handleMoveBlock(direction) {
        if (this.isGameOver) return;
        const activeIndex = this.blocks.length - 1;
        const tentativeBlocks = this.blocks.map((b, idx) => {
            if (idx === activeIndex) {
                const newPos = [...b.position];
                if (direction === 'left') newPos[0] -= 1;
                if (direction === 'right') newPos[0] += 1;
                return new Block(b.numQubits, b.stateVector, newPos);
            }
            return b;
        });

        const res = removeInterference(tentativeBlocks);
        if (!checkOverlap(res.blocks)) {
            this.blocks = res.blocks;
            if (res.didCancel) {
                this.points += 1;
                this.blocks.push(this.upcomingBlocks.shift());
                this.ensureUpcomingBlocks();
            }
        }
    }

    update() {
        if (this.isGameOver) return;
        this.ensureUpcomingBlocks();

        const activeIndex = this.blocks.length - 1;
        const activeBlock = this.blocks[activeIndex];

        // Fall down by 1
        activeBlock.position[1] -= 1;

        let res = removeInterference(this.blocks);
        if (res.didCancel) {
            this.points += 1;
            this.blocks = res.blocks;
            this.blocks.push(this.upcomingBlocks.shift());
            this.blocks[this.blocks.length - 1].position[1] -= 1;
        } else {
            // Check if they cancel two moves ahead
            activeBlock.position[1] -= 1;
            res = removeInterference(this.blocks);
            if (res.didCancel) {
                this.points += 1;
                this.blocks = res.blocks;
                this.blocks.push(this.upcomingBlocks.shift());
                this.blocks[this.blocks.length - 1].position[1] -= 1;
            } else {
                // Undo the second fall
                activeBlock.position[1] += 1;
            }
        }

        // Check if landed (overlap with floor or other blocks)
        if (checkOverlap(this.blocks)) {
            if (activeBlock.position[1] >= 18) {
                this.isGameOver = true;
                return;
            }
            // Undo fall and finalize
            activeBlock.position[1] += 1;
            this.blocks.push(this.upcomingBlocks.shift());
            this.ensureUpcomingBlocks();
        }
    }
}

// UI and Render Code
let gameState = null;
let lastTickTime = 0;
let gameLoopId = null;
let highscore = localStorage.getItem('quantris_highscore') || 0;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 35;

// Set high DPI canvas scaling
const dpr = window.devicePixelRatio || 1;
canvas.width = 350 * dpr;
canvas.height = 700 * dpr;
ctx.scale(dpr, dpr);

function getCellCenter(x, y) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = (19 - y) * CELL_SIZE + CELL_SIZE / 2;
    return { x: cx, y: cy };
}

function drawGrid() {
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, 350, 700);

    // Draw grid checker lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= 10; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL_SIZE, 0);
        ctx.lineTo(c * CELL_SIZE, 700);
        ctx.stroke();
    }
    for (let r = 0; r <= 20; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL_SIZE);
        ctx.lineTo(350, r * CELL_SIZE);
        ctx.stroke();
    }
}

function drawArrow(x1, y1, x2, y2, color, isDouble = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    // Shadow glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrow Head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 10;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (isDouble) {
        // Draw Hadamard marker (circle on arrow shaft)
        ctx.beginPath();
        ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawGhostBlock(block) {
    if (!block) return;
    const ghost = new Block(block.numQubits, block.stateVector, [...block.position]);
    const tempBlocks = [...gameState.blocks];
    const activeIdx = tempBlocks.length - 1;

    while (true) {
        ghost.position[1] -= 1;
        tempBlocks[activeIdx] = ghost;
        if (checkOverlap(tempBlocks)) {
            ghost.position[1] += 1;
            break;
        }
    }

    const squares = ghost.getCoveredSquares();
    const qState = ghost.stateVector;
    
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([4, 4]);

    for (const sq of squares) {
        const color = block.numQubits === 1 ? getQubitColor(qState) : '#bd00ff';
        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1.5;
        
        const pad = 2;
        drawRoundedRect(ctx, sq[0] * CELL_SIZE + pad, (19 - sq[1]) * CELL_SIZE + pad, CELL_SIZE - pad*2, CELL_SIZE - pad*2, 6);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

function drawBlock(block, isActive = false) {
    const x = block.position[0];
    const y = block.position[1];
    const sqs = block.getCoveredSquares();

    if (block.numQubits === 1) {
        const qState = block.stateVector;
        const color = getQubitColor(qState);
        const fillCol = color.replace('hsl', 'hsla').replace(')', ', 0.16)');

        for (const sq of sqs) {
            ctx.save();
            ctx.fillStyle = fillCol;
            ctx.strokeStyle = color;
            ctx.lineWidth = isActive ? 2 : 1;
            if (isActive) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;
            }
            const pad = 2;
            drawRoundedRect(ctx, sq[0] * CELL_SIZE + pad, (19 - sq[1]) * CELL_SIZE + pad, CELL_SIZE - pad*2, CELL_SIZE - pad*2, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        const center = getCellCenter(x, y);
        const arrowDir = [qState[0], qState[1]];
        const arrowLength = CELL_SIZE - 6;
        const targetX = center.x + arrowDir[0] * arrowLength;
        const targetY = center.y - arrowDir[1] * arrowLength;

        ctx.save();
        ctx.beginPath();
        ctx.arc(center.x, center.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 12 : 6;
        ctx.fill();
        ctx.restore();

        const isHadamard = Math.abs(qState[0] * qState[1]) > 0.1;
        drawArrow(center.x, center.y, targetX, targetY, color, isHadamard);
    } else {
        const q1 = [
            block.stateVector[0] + block.stateVector[1],
            block.stateVector[2] + block.stateVector[3]
        ];
        const q2 = [
            block.stateVector[0] + block.stateVector[2],
            block.stateVector[1] + block.stateVector[3]
        ];

        const color1 = getQubitColor(q1);
        const color2 = getQubitColor(q2);
        const fillCol1 = color1.replace('hsl', 'hsla').replace(')', ', 0.16)');
        const fillCol2 = color2.replace('hsl', 'hsla').replace(')', ', 0.16)');

        for (let i = 0; i < 2; i++) {
            const sq = sqs[i];
            ctx.save();
            ctx.fillStyle = fillCol1;
            ctx.strokeStyle = color1;
            ctx.lineWidth = isActive ? 2 : 1;
            if (isActive) {
                ctx.shadowColor = color1;
                ctx.shadowBlur = 6;
            }
            const pad = 2;
            drawRoundedRect(ctx, sq[0] * CELL_SIZE + pad, (19 - sq[1]) * CELL_SIZE + pad, CELL_SIZE - pad*2, CELL_SIZE - pad*2, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 2; i < 4; i++) {
            const sq = sqs[i];
            ctx.save();
            ctx.fillStyle = fillCol2;
            ctx.strokeStyle = color2;
            ctx.lineWidth = isActive ? 2 : 1;
            if (isActive) {
                ctx.shadowColor = color2;
                ctx.shadowBlur = 6;
            }
            const pad = 2;
            drawRoundedRect(ctx, sq[0] * CELL_SIZE + pad, (19 - sq[1]) * CELL_SIZE + pad, CELL_SIZE - pad*2, CELL_SIZE - pad*2, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        const c1 = getCellCenter(x, y);
        const c2 = getCellCenter(x + 2, y);

        ctx.save();
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.shadowColor = 'rgba(189, 0, 255, 0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(c1.x, c1.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color1;
        ctx.shadowColor = color1;
        ctx.shadowBlur = isActive ? 12 : 6;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(c2.x, c2.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color2;
        ctx.shadowColor = color2;
        ctx.shadowBlur = isActive ? 12 : 6;
        ctx.fill();
        ctx.restore();

        const arrowLength = CELL_SIZE - 6;
        
        const target1X = c1.x + q1[0] * arrowLength;
        const target1Y = c1.y - q1[1] * arrowLength;
        const isH1 = Math.abs(q1[0] * q1[1]) > 0.1;
        drawArrow(c1.x, c1.y, target1X, target1Y, color1, isH1);

        const target2X = c2.x + q2[0] * arrowLength;
        const target2Y = c2.y - q2[1] * arrowLength;
        const isH2 = Math.abs(q2[0] * q2[1]) > 0.1;
        drawArrow(c2.x, c2.y, target2X, target2Y, color2, isH2);
    }
}

function drawGame() {
    drawGrid();

    if (!gameState) return;

    const activeBlock = gameState.blocks[gameState.blocks.length - 1];
    if (activeBlock && !gameState.isGameOver) {
        drawGhostBlock(activeBlock);
    }

    for (let i = 0; i < gameState.blocks.length; i++) {
        const isActive = (i === gameState.blocks.length - 1);
        drawBlock(gameState.blocks[i], isActive);
    }

    document.getElementById('score-val').innerText = gameState.points;
    if (gameState.points > highscore) {
        highscore = gameState.points;
        localStorage.setItem('quantris_highscore', highscore);
    }
    document.getElementById('high-score-val').innerText = highscore;
    document.getElementById('difficulty-val').innerText = (1 / gameState.difficulty).toFixed(2);

    if (activeBlock) {
        const isTwoQubits = (activeBlock.numQubits === 2);
        document.getElementById('gate-cx').disabled = !isTwoQubits;
        document.getElementById('gate-cz').disabled = !isTwoQubits;
        document.getElementById('gate-ch').disabled = !isTwoQubits;
    }

    renderPreviews();
}

function renderPreviews() {
    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`upcoming-${i + 1}`);
        slotEl.innerHTML = ''; // Clear

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 120;
        previewCanvas.height = 70;
        slotEl.appendChild(previewCanvas);

        const pCtx = previewCanvas.getContext('2d');
        const block = gameState.upcomingBlocks[i];
        if (!block) continue;

        pCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        pCtx.fillRect(0, 0, 120, 70);

        // Center preview drawings
        const scale = 0.75;
        pCtx.save();
        pCtx.scale(scale, scale);

        if (block.numQubits === 1) {
            const cx = 80;
            const cy = 46;
            const q = block.stateVector;
            const color = getQubitColor(q);

            pCtx.beginPath();
            pCtx.arc(cx, cy, 6, 0, 2 * Math.PI);
            pCtx.fillStyle = color;
            pCtx.fill();

            const arrowLength = 22;
            const targetX = cx + q[0] * arrowLength;
            const targetY = cy - q[1] * arrowLength;
            const isH = Math.abs(q[0] * q[1]) > 0.1;

            pCtx.strokeStyle = color;
            pCtx.fillStyle = color;
            pCtx.lineWidth = 3;
            pCtx.beginPath();
            pCtx.moveTo(cx, cy);
            pCtx.lineTo(targetX, targetY);
            pCtx.stroke();

            // Arrow head
            const angle = Math.atan2(targetY - cy, targetX - cx);
            pCtx.beginPath();
            pCtx.moveTo(targetX, targetY);
            pCtx.lineTo(targetX - 7 * Math.cos(angle - Math.PI/6), targetY - 7 * Math.sin(angle - Math.PI/6));
            pCtx.lineTo(targetX - 7 * Math.cos(angle + Math.PI/6), targetY - 7 * Math.sin(angle + Math.PI/6));
            pCtx.closePath();
            pCtx.fill();
        } else {
            // 2 Qubits centered
            const cx1 = 45;
            const cx2 = 115;
            const cy = 46;

            const q1 = [block.stateVector[0] + block.stateVector[1], block.stateVector[2] + block.stateVector[3]];
            const q2 = [block.stateVector[0] + block.stateVector[2], block.stateVector[1] + block.stateVector[3]];

            const color1 = getQubitColor(q1);
            const color2 = getQubitColor(q2);

            // Connect
            pCtx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
            pCtx.lineWidth = 2;
            pCtx.setLineDash([3, 3]);
            pCtx.beginPath();
            pCtx.moveTo(cx1, cy);
            pCtx.lineTo(cx2, cy);
            pCtx.stroke();

            // Qubit 1
            pCtx.beginPath();
            pCtx.arc(cx1, cy, 6, 0, 2 * Math.PI);
            pCtx.fillStyle = color1;
            pCtx.fill();

            // Qubit 2
            pCtx.beginPath();
            pCtx.arc(cx2, cy, 6, 0, 2 * Math.PI);
            pCtx.fillStyle = color2;
            pCtx.fill();

            const arrowLength = 22;
            
            // Arrow 1
            const target1X = cx1 + q1[0] * arrowLength;
            const target1Y = cy - q1[1] * arrowLength;
            pCtx.strokeStyle = color1;
            pCtx.fillStyle = color1;
            pCtx.lineWidth = 3;
            pCtx.beginPath();
            pCtx.moveTo(cx1, cy);
            pCtx.lineTo(target1X, target1Y);
            pCtx.stroke();
            const a1 = Math.atan2(target1Y - cy, target1X - cx1);
            pCtx.beginPath();
            pCtx.moveTo(target1X, target1Y);
            pCtx.lineTo(target1X - 7 * Math.cos(a1 - Math.PI/6), target1Y - 7 * Math.sin(a1 - Math.PI/6));
            pCtx.lineTo(target1X - 7 * Math.cos(a1 + Math.PI/6), target1Y - 7 * Math.sin(a1 + Math.PI/6));
            pCtx.closePath();
            pCtx.fill();

            // Arrow 2
            const target2X = cx2 + q2[0] * arrowLength;
            const target2Y = cy - q2[1] * arrowLength;
            pCtx.strokeStyle = color2;
            pCtx.fillStyle = color2;
            pCtx.beginPath();
            pCtx.moveTo(cx2, cy);
            pCtx.lineTo(target2X, target2Y);
            pCtx.stroke();
            const a2 = Math.atan2(target2Y - cy, target2X - cx2);
            pCtx.beginPath();
            pCtx.moveTo(target2X, target2Y);
            pCtx.lineTo(target2X - 7 * Math.cos(a2 - Math.PI/6), target2Y - 7 * Math.sin(a2 - Math.PI/6));
            pCtx.lineTo(target2X - 7 * Math.cos(a2 + Math.PI/6), target2Y - 7 * Math.sin(a2 + Math.PI/6));
            pCtx.closePath();
            pCtx.fill();
        }
        pCtx.restore();
    }
}

// Game Loop Timing
function tick(time) {
    if (!lastTickTime) lastTickTime = time;
    const progress = (time - lastTickTime) / 1000;

    if (progress >= gameState.difficulty) {
        gameState.update();
        drawGame();
        lastTickTime = time;

        if (gameState.isGameOver) {
            showGameOver();
            return;
        }
    }

    gameLoopId = requestAnimationFrame(tick);
}

function startGame() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    
    gameState = new GameState();
    lastTickTime = 0;
    
    // Hide overlay
    document.getElementById('game-overlay').classList.add('hidden');
    
    drawGame();
    gameLoopId = requestAnimationFrame(tick);
}

function showGameOver() {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;

    document.getElementById('overlay-title').innerText = 'Game Over';
    document.getElementById('overlay-desc').innerText = `You scored ${gameState.points} points! Ready to try again?`;
    document.getElementById('btn-start').innerText = 'Play Again';
    document.getElementById('game-overlay').classList.remove('hidden');
}

// Difficulty buttons event listeners
document.getElementById('diff-minus').addEventListener('click', () => {
    if (gameState) adjustDifficulty(1);
});
document.getElementById('diff-plus').addEventListener('click', () => {
    if (gameState) adjustDifficulty(-1);
});

// Interactive gate buttons
document.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const gate = btn.getAttribute('data-gate');
        if (gameState) {
            gameState.handleGateAction(gate);
            drawGame();
        }
    });
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (!gameState || gameState.isGameOver) return;
    
    const key = e.key.toLowerCase();
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        gameState.handleMoveBlock('left');
        drawGame();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        gameState.handleMoveBlock('right');
        drawGame();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        gameState.update();
        drawGame();
    } else if (key === 'x') {
        gameState.handleGateAction('x');
        drawGame();
    } else if (key === 'z') {
        gameState.handleGateAction('z');
        drawGame();
    } else if (key === 'h') {
        gameState.handleGateAction('h');
        drawGame();
    } else if (key === 's') { // CX
        gameState.handleGateAction('cx');
        drawGame();
    } else if (key === 'a') { // CZ
        gameState.handleGateAction('cz');
        drawGame();
    }
});

// Start button
document.getElementById('btn-start').addEventListener('click', startGame);

// Modal dialog helpers
const modal = document.getElementById('how-to-modal');
document.getElementById('btn-how-to').addEventListener('click', () => {
    modal.classList.add('active');
});
document.getElementById('modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
});
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Initial draw grid
drawGrid();
renderPreviews();
document.getElementById('high-score-val').innerText = highscore;
