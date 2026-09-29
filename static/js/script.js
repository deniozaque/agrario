const cuadrado     = document.getElementById('cuadrado');
const minimapa     = document.getElementById('minimapa');
const miniViewport = document.getElementById('minimapa-viewport');
const miniCirculo  = document.getElementById('minimapa-circulo');

let velocidad = 1.2;

let mouseClientX = window.innerWidth  / 2;
let mouseClientY = window.innerHeight / 2;

const TOTAL_PUNTOS    = 1500;
const BARRA           = 40;
const TAMANIO_INICIAL = 22;
const BOOST_SPEED     = 18;
const FRICCION        = 0.88;
const MERGE_COOLDOWN  = 10000;
const MAX_PUNTOS      = 2000;

const COLORES = [
    '#ff4757','#ff6b81','#ffa502','#eccc68',
    '#2ed573','#1e90ff','#5352ed','#ff6348',
    '#70a1ff','#7bed9f','#ff4500','#00d2d3',
    '#ff9f43','#ee5a24','#0652DD','#9980FA',
    '#833471','#006266','#F9CA24','#6ab04c',
];

const puntos  = [];
const celulas = [];
const bots    = [];

const BOT_LIMIT  = 20;
const BOT_SPEED  = 0.9;
let _botIdCounter = 0;

const BOT_COLORES = [
    '#2ed573','#1e90ff','#ffa502','#5352ed','#00d2d3',
    '#ff9f43','#6ab04c','#9980FA','#F9CA24','#ee5a24',
    '#0652DD','#833471','#006266','#eccc68','#70a1ff',
    '#ff6348','#7bed9f','#ff6b81','#a29bfe','#fdcb6e',
];

function crearPunto() {
    const el    = document.createElement('div');
    const size  = Math.random() * 3 + 2;
    const color = COLORES[Math.floor(Math.random() * COLORES.length)];
    const x     = Math.random() * (cuadrado.offsetWidth  - 80) + 40;
    const y     = Math.random() * (cuadrado.offsetHeight - 80) + 40;
    el.className = 'punto';
    el.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${x}px;top:${y}px;opacity:${(Math.random()*0.5+0.5).toFixed(2)}`;
    cuadrado.appendChild(el);
    return { el, x, y, r: size / 2 };
}
function generarPuntos(n) { for (let i = 0; i < n; i++) puntos.push(crearPunto()); }

let _celulaIdCounter = 0;

function crearCelula(x, y, diameter, vx, vy, mergeAt, cellScore) {
    vx        = vx        || 0;
    vy        = vy        || 0;
    mergeAt   = mergeAt   || 0;
    cellScore = cellScore || 0;
    const id  = _celulaIdCounter++;

    const el = document.createElement('div');
    el.className = 'celula';
    el.style.width  = diameter + 'px';
    el.style.height = diameter + 'px';
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';

    const numEl = document.createElement('span');
    numEl.className   = 'cell-numero';
    numEl.textContent = cellScore;
    el.appendChild(numEl);

    cuadrado.appendChild(el);
    return { el, numEl, x, y, diameter, vx, vy, mergeAt, cellScore, id };
}

function setCelulaDiameter(c, d) {
    c.diameter        = d;
    c.el.style.width  = d + 'px';
    c.el.style.height = d + 'px';
}

function updateCellScore(c) {
    c.numEl.textContent = c.cellScore;
}

window.onload = () => {
    const staticEl = document.getElementById('circulo');
    if (staticEl) staticEl.remove();

    const cx = cuadrado.offsetWidth  / 2;
    const cy = cuadrado.offsetHeight / 2;
    celulas.push(crearCelula(cx, cy, TAMANIO_INICIAL, 0, 0, 0));

    window.scrollTo({
        left: cuadrado.offsetLeft + cx - window.innerWidth  / 2,
        top:  cuadrado.offsetTop  + cy - window.innerHeight / 2,
        behavior: 'instant'
    });

    generarPuntos(TOTAL_PUNTOS);
    generarBots();

    animate();
};

document.addEventListener('mousemove', (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const rect      = cuadrado.getBoundingClientRect();
    const mapMouseX = mouseClientX - rect.left;
    const mapMouseY = mouseClientY - rect.top;

    const snapshot = celulas.slice();

    for (const c of snapshot) {
        if (c.cellScore < 20) continue;

        const nuevoDiam  = c.diameter / Math.SQRT2;
        const canMergeAt = Date.now() + MERGE_COOLDOWN;

        const mitadScore = Math.floor(c.cellScore / 2);
        c.cellScore = mitadScore;
        updateCellScore(c);

        setCelulaDiameter(c, nuevoDiam);
        c.mergeAt = canMergeAt;

        const ddx   = mapMouseX - c.x;
        const ddy   = mapMouseY - c.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;

        const nuevaScore = c.cellScore;
        const nueva = crearCelula(
            c.x, c.y, nuevoDiam,
            (ddx / ddist) * BOOST_SPEED,
            (ddy / ddist) * BOOST_SPEED,
            canMergeAt,
            nuevaScore
        );
        celulas.push(nueva);
    }
});

function checkColisiones() {
    for (const c of celulas) {
        const r = c.diameter / 2;
        for (let i = puntos.length - 1; i >= 0; i--) {
            const p  = puntos[i];
            const dx = c.x - p.x;
            const dy = c.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < r + p.r + 2) {
                p.el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
                p.el.style.transform  = 'translate(-50%,-50%) scale(2)';
                p.el.style.opacity    = '0';
                const ref = p.el;
                setTimeout(() => ref.remove(), 150);
                puntos.splice(i, 1);

                if (c.cellScore < MAX_PUNTOS) {
                    c.cellScore++;
                    updateCellScore(c);
                    setCelulaDiameter(c, c.diameter + 0.4);
                    velocidad = Math.max(0.3, velocidad - 0.001);
                }
                puntos.push(crearPunto());
            }
        }
    }
}

function checkFusiones() {
    const now = Date.now();

    for (let i = 0; i < celulas.length; i++) {
        for (let j = celulas.length - 1; j > i; j--) {
            const a = celulas[i];
            const b = celulas[j];

            if (now < a.mergeAt || now < b.mergeAt) continue;

            const dx   = a.x - b.x;
            const dy   = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ra   = a.diameter / 2;
            const rb   = b.diameter / 2;

            const attract = 2.0;
            if (dist > 1) {
                b.x += (dx / dist) * attract;
                b.y += (dy / dist) * attract;
            }

            if (dist < ra + rb) {
                const newDiam = Math.sqrt(a.diameter * a.diameter + b.diameter * b.diameter);
                setCelulaDiameter(a, newDiam);
                a.cellScore = Math.min(MAX_PUNTOS, a.cellScore + b.cellScore);
                updateCellScore(a);
                a.mergeAt = 0;

                b.el.remove();
                celulas.splice(j, 1);
            }
        }
    }
}

function updateMinimapa() {
    const mapaW    = cuadrado.offsetWidth;
    const mapaH    = cuadrado.offsetHeight;
    const scaleX   = minimapa.offsetWidth  / mapaW;
    const scaleY   = minimapa.offsetHeight / mapaH;
    const scrollL  = window.scrollX;
    const scrollT  = window.scrollY;
    const cRect    = cuadrado.getBoundingClientRect();

    miniViewport.style.left   = ((scrollL - (cRect.left + scrollL)) * scaleX) + 'px';
    miniViewport.style.top    = ((scrollT - (cRect.top  + scrollT)) * scaleY) + 'px';
    miniViewport.style.width  = (window.innerWidth  * scaleX) + 'px';
    miniViewport.style.height = (window.innerHeight * scaleY) + 'px';

    if (celulas.length > 0) {
        miniCirculo.style.left = (celulas[0].x * scaleX) + 'px';
        miniCirculo.style.top  = (celulas[0].y * scaleY) + 'px';
    }
}

function centrarCamara() {
    if (celulas.length === 0) return;
    let cx = 0, cy = 0;
    for (const c of celulas) { cx += c.x; cy += c.y; }
    cx /= celulas.length;
    cy /= celulas.length;

    const maxSX = document.documentElement.scrollWidth  - window.innerWidth;
    const maxSY = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(
        Math.max(0, Math.min(cuadrado.offsetLeft + cx - window.innerWidth  / 2, maxSX)),
        Math.max(0, Math.min(cuadrado.offsetTop  + cy - window.innerHeight / 2, maxSY))
    );
}

function animate() {
    centrarCamara();

    const rect      = cuadrado.getBoundingClientRect();
    const mapMouseX = mouseClientX - rect.left;
    const mapMouseY = mouseClientY - rect.top;

    let anyOver = false;

    for (const c of celulas) {
        c.vx *= FRICCION;
        c.vy *= FRICCION;

        const dx   = mapMouseX - c.x;
        const dy   = mapMouseY - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist > velocidad) {
            c.x += (dx / dist) * velocidad;
            c.y += (dy / dist) * velocidad;
        } else {
            c.x = mapMouseX;
            c.y = mapMouseY;
        }

        c.x += c.vx;
        c.y += c.vy;

        const r = c.diameter / 2;
        c.x = Math.max(BARRA + r, Math.min(c.x, cuadrado.offsetWidth  - BARRA - r));
        c.y = Math.max(BARRA + r, Math.min(c.y, cuadrado.offsetHeight - BARRA - r));

        c.el.style.left = c.x + 'px';
        c.el.style.top  = c.y + 'px';

        const sx = c.x + rect.left;
        const sy = c.y + rect.top;
        if (Math.sqrt((mouseClientX - sx) ** 2 + (mouseClientY - sy) ** 2) < r) {
            anyOver = true;
        }
    }

    cuadrado.style.cursor = anyOver ? 'none' : 'crosshair';

    separateCells();
    separateBotCells();

    checkColisiones();
    updateBots();
    checkComidasBots();
    checkFusiones();
    checkFusionesBots();
    checkBotRespawn();
    updateMinimapa();
    updateLeaderboard();

    requestAnimationFrame(animate);
}

function separateCells() {
    const now = Date.now();
    for (let i = 0; i < celulas.length; i++) {
        for (let j = i + 1; j < celulas.length; j++) {
            const a  = celulas[i];
            const b  = celulas[j];
            if (now >= a.mergeAt && now >= b.mergeAt) continue;

            const ra = a.diameter / 2;
            const rb = b.diameter / 2;
            const dx   = b.x - a.x;
            const dy   = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const minDist = ra + rb;
            if (dist < minDist) {
                const push = (minDist - dist) / 2;
                const nx = dx / dist, ny = dy / dist;
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
            }
        }
    }
}

function separateBotCells() {
    const now = Date.now();
    for (let i = 0; i < bots.length; i++) {
        for (let j = i + 1; j < bots.length; j++) {
            const a = bots[i];
            const b = bots[j];
            if (a.botId !== b.botId) continue;
            if (now >= a.mergeAt && now >= b.mergeAt) continue;

            const ra = a.diameter / 2;
            const rb = b.diameter / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const minDist = ra + rb;
            if (dist < minDist) {
                const push = (minDist - dist) / 2;
                const nx = dx / dist, ny = dy / dist;
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
            }
        }
    }
}

function crearBot(x, y, diameter, cellScore, color, botId) {
    if (botId === undefined) {
        botId = _botIdCounter++;
    }
    diameter  = diameter  || TAMANIO_INICIAL;
    cellScore = cellScore || 0;
    color     = color || BOT_COLORES[Math.floor(Math.random() * BOT_COLORES.length)];

    const el = document.createElement('div');
    el.className = 'celula';
    el.style.backgroundColor = color;
    el.style.boxShadow = `0 0 8px ${color}99`;
    el.style.width  = diameter + 'px';
    el.style.height = diameter + 'px';
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';

    const numEl = document.createElement('span');
    numEl.className = 'cell-numero';
    numEl.textContent = cellScore;
    el.appendChild(numEl);

    cuadrado.appendChild(el);
    return {
        el, numEl, x, y,
        diameter, cellScore, color, botId,
        vx: 0, vy: 0,
        tx: x, ty: y, wanderTimer: 0,
        mergeAt: 0, splitCooldown: 0,
        id: _celulaIdCounter++
    };
}

function generarBots() {
    const W = cuadrado.offsetWidth, H = cuadrado.offsetHeight;
    for (let i = 0; i < BOT_LIMIT; i++) {
        const x = Math.random() * (W - 80) + 40;
        const y = Math.random() * (H - 80) + 40;
        bots.push(crearBot(x, y));
    }
}

function getDistinctBotCount() {
    const ids = new Set();
    for (const b of bots) ids.add(b.botId);
    return ids.size;
}

let botRespawnPending = false;
function checkBotRespawn() {
    const distinctCount = getDistinctBotCount();
    if (distinctCount < BOT_LIMIT && !botRespawnPending) {
        botRespawnPending = true;
        setTimeout(() => {
            botRespawnPending = false;
            const W = cuadrado.offsetWidth, H = cuadrado.offsetHeight;
            while (getDistinctBotCount() < BOT_LIMIT) {
                const x = Math.random() * (W - 80) + 40;
                const y = Math.random() * (H - 80) + 40;
                bots.push(crearBot(x, y));
            }
        }, 1200);
    }
}

function respawnJugador() {
    const W = cuadrado.offsetWidth  || 3000;
    const H = cuadrado.offsetHeight || 3000;

    let rx = W / 2, ry = H / 2;
    for (let attempts = 0; attempts < 25; attempts++) {
        rx = Math.random() * (W - BARRA * 2 - 200) + BARRA + 100;
        ry = Math.random() * (H - BARRA * 2 - 200) + BARRA + 100;
        let safe = true;
        for (const b of bots) {
            if (Math.hypot(b.x - rx, b.y - ry) < b.diameter + 100) {
                safe = false;
                break;
            }
        }
        if (safe) break;
    }

    velocidad = 1.2;

    const nueva = crearCelula(rx, ry, TAMANIO_INICIAL, 0, 0, 0, 0);
    celulas.push(nueva);

    centrarCamara();
}

function checkFusionesBots() {
    const now = Date.now();
    for (let i = 0; i < bots.length; i++) {
        for (let j = bots.length - 1; j > i; j--) {
            if (i >= bots.length || j >= bots.length) continue;
            const a = bots[i];
            const b = bots[j];
            if (a.botId !== b.botId) continue;
            if (now < a.mergeAt || now < b.mergeAt) continue;

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ra = a.diameter / 2;
            const rb = b.diameter / 2;

            const attract = 1.8;
            if (dist > 1) {
                b.x += (dx / dist) * attract;
                b.y += (dy / dist) * attract;
            }

            if (dist < ra + rb) {
                const newDiam = Math.sqrt(a.diameter * a.diameter + b.diameter * b.diameter);
                setBotDiameter(a, newDiam);
                a.cellScore = Math.min(MAX_PUNTOS, a.cellScore + b.cellScore);
                a.numEl.textContent = a.cellScore;
                a.mergeAt = 0;

                b.el.remove();
                bots.splice(j, 1);
            }
        }
    }
}

const lbList = document.getElementById('lb-list');
let lbFrameCount = 0;

function updateLeaderboard() {
    if (!lbList) return;
    lbFrameCount++;
    if (lbFrameCount % 15 !== 0) return;

    const data = [];

    let pScore = 0;
    for (const c of celulas) pScore += c.cellScore;
    if (celulas.length > 0) {
        data.push({ name: 'Tú', score: Math.min(MAX_PUNTOS, pScore), isPlayer: true });
    }

    const botMap = new Map();
    for (const b of bots) {
        const cur = botMap.get(b.botId) || 0;
        botMap.set(b.botId, Math.min(MAX_PUNTOS, cur + b.cellScore));
    }
    for (const [botId, score] of botMap.entries()) {
        data.push({ name: `Bot #${botId + 1}`, score, isPlayer: false });
    }

    data.sort((a, b) => b.score - a.score);

    const top5 = data.slice(0, 5);
    lbList.innerHTML = top5.map((item, idx) => `
        <li class="${item.isPlayer ? 'is-player' : ''}">
            ${idx === 0 ? '👑 ' : ''}${item.name}: ${item.score}
        </li>
    `).join('');
}

function setBotDiameter(b, d) {
    b.diameter        = d;
    b.el.style.width  = d + 'px';
    b.el.style.height = d + 'px';
}

function updateBots() {
    const W = cuadrado.offsetWidth, H = cuadrado.offsetHeight;
    const now = Date.now();
    const snapshotBots = bots.slice();

    for (const b of snapshotBots) {
        if (!bots.includes(b)) continue;

        b.vx = (b.vx || 0) * FRICCION;
        b.vy = (b.vy || 0) * FRICCION;

        let tx = b.tx, ty = b.ty;
        let bestDist = Infinity;
        let mode = 'wander';

        let fleeX = 0, fleeY = 0, hasThreat = false;
        const checkThreat = (ex, ey, eScore) => {
            if (eScore > b.cellScore) {
                const d = Math.sqrt((ex-b.x)**2 + (ey-b.y)**2);
                if (d < 280) { fleeX += b.x - ex; fleeY += b.y - ey; hasThreat = true; }
            }
        };
        for (const c of celulas) checkThreat(c.x, c.y, c.cellScore);
        for (const ob of bots) {
            if (ob.botId !== b.botId) checkThreat(ob.x, ob.y, ob.cellScore);
        }

        if (hasThreat) {
            mode = 'flee';
            const fd = Math.sqrt(fleeX*fleeX + fleeY*fleeY) || 1;
            tx = b.x + (fleeX / fd) * 200;
            ty = b.y + (fleeY / fd) * 200;
        } else {
            const checkPrey = (ex, ey, eScore) => {
                if (b.cellScore > eScore) {
                    const d = Math.sqrt((ex-b.x)**2 + (ey-b.y)**2);
                    if (d < bestDist) { bestDist = d; tx = ex; ty = ey; mode = 'chase'; }
                }
            };
            for (const c of celulas) checkPrey(c.x, c.y, c.cellScore);
            for (const ob of bots) {
                if (ob.botId !== b.botId) checkPrey(ob.x, ob.y, ob.cellScore);
            }

            if (mode === 'wander') {
                bestDist = 350;
                for (const p of puntos) {
                    const d = Math.sqrt((p.x-b.x)**2 + (p.y-b.y)**2);
                    if (d < bestDist) { bestDist = d; tx = p.x; ty = p.y; mode = 'food'; }
                }
            }

            if (mode === 'wander') {
                b.wanderTimer--;
                if (b.wanderTimer <= 0) {
                    b.tx = Math.random() * (W - 80) + 40;
                    b.ty = Math.random() * (H - 80) + 40;
                    b.wanderTimer = 120 + Math.floor(Math.random() * 180);
                }
                tx = b.tx; ty = b.ty;
            }
        }

        const myPieces = bots.filter(cell => cell.botId === b.botId).length;
        if (b.cellScore >= 20 && now >= (b.splitCooldown || 0) && !hasThreat && myPieces < 2) {
            const splitScore = Math.floor(b.cellScore / 2);
            let bestTarget = null;
            let bestTargetDist = Infinity;

            for (const c of celulas) {
                if (splitScore > c.cellScore) {
                    const d = Math.hypot(c.x - b.x, c.y - b.y);
                    const minD = (b.diameter + c.diameter) / 2 + 15;
                    const maxD = Math.min(270, b.diameter + 180);
                    if (d >= minD && d <= maxD && d < bestTargetDist) {
                        let danger = false;
                        for (const oc of celulas) {
                            if (oc.cellScore > splitScore && Math.hypot(oc.x - c.x, oc.y - c.y) < 220) {
                                danger = true; break;
                            }
                        }
                        if (!danger) {
                            for (const ob of bots) {
                                if (ob.botId !== b.botId && ob.cellScore > splitScore && Math.hypot(ob.x - c.x, ob.y - c.y) < 220) {
                                    danger = true; break;
                                }
                            }
                        }
                        if (!danger) {
                            bestTarget = c;
                            bestTargetDist = d;
                        }
                    }
                }
            }

            for (const ob of bots) {
                if (ob.botId !== b.botId && splitScore > ob.cellScore) {
                    const d = Math.hypot(ob.x - b.x, ob.y - b.y);
                    const minD = (b.diameter + ob.diameter) / 2 + 15;
                    const maxD = Math.min(270, b.diameter + 180);
                    if (d >= minD && d <= maxD && d < bestTargetDist) {
                        let danger = false;
                        for (const oc of celulas) {
                            if (oc.cellScore > splitScore && Math.hypot(oc.x - ob.x, oc.y - ob.y) < 220) {
                                danger = true; break;
                            }
                        }
                        if (!danger) {
                            for (const oob of bots) {
                                if (oob.botId !== b.botId && oob.cellScore > splitScore && Math.hypot(oob.x - ob.x, oob.y - ob.y) < 220) {
                                    danger = true; break;
                                }
                            }
                        }
                        if (!danger) {
                            bestTarget = ob;
                            bestTargetDist = d;
                        }
                    }
                }
            }

            if (bestTarget) {
                const ddx = bestTarget.x - b.x;
                const ddy = bestTarget.y - b.y;
                const ddist = Math.hypot(ddx, ddy) || 1;
                const dirX = ddx / ddist;
                const dirY = ddy / ddist;

                const nuevoDiam = b.diameter / Math.SQRT2;
                const mitadScore = Math.floor(b.cellScore / 2);
                b.cellScore = mitadScore;
                b.numEl.textContent = b.cellScore;
                setBotDiameter(b, nuevoDiam);

                const canMergeAt = now + MERGE_COOLDOWN;
                b.mergeAt = canMergeAt;
                b.splitCooldown = now + 7000;

                const nueva = crearBot(b.x, b.y, nuevoDiam, mitadScore, b.color, b.botId);
                nueva.vx = dirX * BOOST_SPEED;
                nueva.vy = dirY * BOOST_SPEED;
                nueva.mergeAt = canMergeAt;
                nueva.splitCooldown = now + 7000;
                nueva.tx = bestTarget.x;
                nueva.ty = bestTarget.y;

                bots.push(nueva);
            }
        }

        const dx = tx - b.x, dy = ty - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        if (dist > BOT_SPEED) {
            b.x += (dx / dist) * BOT_SPEED;
            b.y += (dy / dist) * BOT_SPEED;
        } else {
            b.x = tx;
            b.y = ty;
        }

        b.x += b.vx;
        b.y += b.vy;

        const r = b.diameter / 2;
        b.x = Math.max(BARRA + r, Math.min(b.x, W - BARRA - r));
        b.y = Math.max(BARRA + r, Math.min(b.y, H - BARRA - r));

        b.el.style.left = b.x + 'px';
        b.el.style.top  = b.y + 'px';
    }
}

function checkComidasBots() {
    for (const b of bots) {
        const r = b.diameter / 2;
        for (let i = puntos.length - 1; i >= 0; i--) {
            const p = puntos[i];
            if (Math.sqrt((b.x-p.x)**2 + (b.y-p.y)**2) < r + p.r + 2) {
                p.el.style.transition = 'transform 0.15s, opacity 0.15s';
                p.el.style.transform  = 'translate(-50%,-50%) scale(2)';
                p.el.style.opacity    = '0';
                const ref = p.el;
                setTimeout(() => ref.remove(), 150);
                puntos.splice(i, 1);
                if (b.cellScore < MAX_PUNTOS) {
                    b.cellScore++;
                    b.numEl.textContent = b.cellScore;
                    setBotDiameter(b, b.diameter + 0.4);
                }
                puntos.push(crearPunto());
            }
        }
    }

    for (const b of bots) {
        for (let i = celulas.length - 1; i >= 0; i--) {
            const c = celulas[i];
            if (b.cellScore <= c.cellScore) continue;
            const dist = Math.sqrt((b.x-c.x)**2 + (b.y-c.y)**2);
            if (dist < b.diameter / 2) {
                b.cellScore = Math.min(MAX_PUNTOS, b.cellScore + c.cellScore);
                b.numEl.textContent = b.cellScore;
                setBotDiameter(b, Math.sqrt(b.diameter**2 + c.diameter**2));
                c.el.remove();
                celulas.splice(i, 1);

                if (celulas.length === 0) {
                    respawnJugador();
                }
            }
        }
    }

    for (const c of celulas) {
        for (let i = bots.length - 1; i >= 0; i--) {
            const b = bots[i];
            if (c.cellScore <= b.cellScore) continue;
            const dist = Math.sqrt((c.x-b.x)**2 + (c.y-b.y)**2);
            if (dist < c.diameter / 2) {
                c.cellScore = Math.min(MAX_PUNTOS, c.cellScore + b.cellScore);
                updateCellScore(c);
                setCelulaDiameter(c, Math.sqrt(c.diameter**2 + b.diameter**2));
                b.el.remove();
                bots.splice(i, 1);
                checkBotRespawn();
            }
        }
    }

    for (let i = 0; i < bots.length; i++) {
        for (let j = bots.length - 1; j >= 0; j--) {
            if (i === j || i >= bots.length || j >= bots.length) continue;
            const a = bots[i], b = bots[j];
            if (a.botId === b.botId) continue;
            if (a.cellScore <= b.cellScore) continue;
            const dist = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
            if (dist < a.diameter / 2) {
                a.cellScore = Math.min(MAX_PUNTOS, a.cellScore + b.cellScore);
                a.numEl.textContent = a.cellScore;
                setBotDiameter(a, Math.sqrt(a.diameter**2 + b.diameter**2));
                b.el.remove();
                bots.splice(j, 1);
                if (j < i) i--;
                checkBotRespawn();
            }
        }
    }
}
