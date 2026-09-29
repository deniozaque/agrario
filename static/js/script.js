// ── Referencias al DOM ────────────────────────────────────────────────────────
const cuadrado     = document.getElementById('cuadrado');
const minimapa     = document.getElementById('minimapa');
const miniViewport = document.getElementById('minimapa-viewport');
const miniCirculo  = document.getElementById('minimapa-circulo');

// ── Estado global ─────────────────────────────────────────────────────────────
let velocidad = 1.2;   // px/frame hacia el ratón

let mouseClientX = window.innerWidth  / 2;
let mouseClientY = window.innerHeight / 2;

// ── Constantes ────────────────────────────────────────────────────────────────
const TOTAL_PUNTOS    = 1500;
const BARRA           = 40;
const TAMANIO_INICIAL = 22;
const BOOST_SPEED     = 18;
const FRICCION        = 0.88;
const MERGE_COOLDOWN  = 4000;   // ms tras dividirse antes de poder fusionarse

const COLORES = [
    '#ff4757','#ff6b81','#ffa502','#eccc68',
    '#2ed573','#1e90ff','#5352ed','#ff6348',
    '#70a1ff','#7bed9f','#ff4500','#00d2d3',
    '#ff9f43','#ee5a24','#0652DD','#9980FA',
    '#833471','#006266','#F9CA24','#6ab04c',
];

// ── Arrays de entidades ───────────────────────────────────────────────────────
const puntos  = [];
const celulas = [];   // { el, numEl, x, y, diameter, vx, vy, mergeAt }

// ── Puntos de comida ──────────────────────────────────────────────────────────
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

// ── Células del jugador ───────────────────────────────────────────────────────
// ID único por célula para trackear contacto entre pares
let _celulaIdCounter = 0;

// Map de pares tocándose → timestamp de inicio del contacto
// Clave: 'id_a-id_b' (siempre a < b). Valor: Date.now() cuando empezaron a tocarse
const touchingMap = new Map();

const TOUCH_MERGE_MS = 10000; // ms que deben estar tocándose para fusionarse

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

// ── Inicialización ────────────────────────────────────────────────────────────
window.onload = () => {
    // Eliminar el circulo estático del HTML
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

    // Iniciamos el loop DENTRO de onload para asegurar que el DOM está listo
    animate();
};

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
});

// Clic derecho → dividir
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const rect      = cuadrado.getBoundingClientRect();
    const mapMouseX = mouseClientX - rect.left;
    const mapMouseY = mouseClientY - rect.top;

    // Snapshot del array actual para no iterar las nuevas células
    const snapshot = celulas.slice();

    for (const c of snapshot) {
        // Solo dividir si la célula ha comido al menos 20 bolas
        if (c.cellScore < 20) continue;

        // d/√2 conserva área: √((d/√2)²+(d/√2)²) = d  →  recupera tamaño al fusionar
        const nuevoDiam  = c.diameter / Math.SQRT2;
        const canMergeAt = Date.now() + MERGE_COOLDOWN;

        // Repartimos el score entre las dos mitades
        const mitadScore = Math.floor(c.cellScore / 2);
        c.cellScore = mitadScore;
        updateCellScore(c);

        // Reducimos la célula original
        setCelulaDiameter(c, nuevoDiam);
        c.mergeAt = canMergeAt;

        // Dirección hacia el ratón para el disparo
        const ddx   = mapMouseX - c.x;
        const ddy   = mapMouseY - c.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;

        // Nueva célula disparada hacia el ratón (lleva la otra mitad del score)
        const nuevaScore = c.cellScore; // mitad (la otra mitad queda en c)
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

// ── Colisiones con comida ─────────────────────────────────────────────────────
function checkColisiones() {
    for (const c of celulas) {
        const r = c.diameter / 2;
        for (let i = puntos.length - 1; i >= 0; i--) {
            const p  = puntos[i];
            const dx = c.x - p.x;
            const dy = c.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < r + p.r + 2) {
                // Animación de desaparición
                p.el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
                p.el.style.transform  = 'translate(-50%,-50%) scale(2)';
                p.el.style.opacity    = '0';
                const ref = p.el;
                setTimeout(() => ref.remove(), 150);
                puntos.splice(i, 1);

                c.cellScore++;
                updateCellScore(c);
                setCelulaDiameter(c, c.diameter + 0.4);
                velocidad = Math.max(0.3, velocidad - 0.001);
                puntos.push(crearPunto());
            }
        }
    }
}

// ── Fusión de células ─────────────────────────────────────────────────────────
function checkFusiones() {
    const now     = Date.now();
    const tocando = new Set(); // claves de pares que se están tocando este frame

    for (let i = 0; i < celulas.length; i++) {
        for (let j = celulas.length - 1; j > i; j--) {
            const a = celulas[i];
            const b = celulas[j];

            // Ambas deben haber superado el cooldown de split
            if (now < a.mergeAt || now < b.mergeAt) continue;

            const dx   = a.x - b.x;
            const dy   = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ra   = a.diameter / 2;
            const rb   = b.diameter / 2;

            // Clave única para este par (siempre menor id primero)
            const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;

            if (dist < ra + rb) {
                // Se están tocando este frame
                tocando.add(key);

                if (!touchingMap.has(key)) {
                    // Primera vez que se tocan → guardar timestamp
                    touchingMap.set(key, now);
                } else if (now - touchingMap.get(key) >= TOUCH_MERGE_MS) {
                    // Llevan 10 s tocándose → fusionar
                    const newDiam = Math.sqrt(a.diameter * a.diameter + b.diameter * b.diameter);
                    setCelulaDiameter(a, newDiam);
                    a.cellScore += b.cellScore;
                    updateCellScore(a);
                    a.mergeAt = 0;

                    touchingMap.delete(key);
                    b.el.remove();
                    celulas.splice(j, 1);
                }
            }
        }
    }

    // Limpiar pares que ya no se están tocando → resetear su contador
    for (const key of touchingMap.keys()) {
        if (!tocando.has(key)) touchingMap.delete(key);
    }
}

// ── Minimapa ──────────────────────────────────────────────────────────────────
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

// ── Cámara centrada en el centro de masa ─────────────────────────────────────
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

// ── Loop principal ────────────────────────────────────────────────────────────
function animate() {
    centrarCamara();

    const rect      = cuadrado.getBoundingClientRect();
    const mapMouseX = mouseClientX - rect.left;
    const mapMouseY = mouseClientY - rect.top;

    let anyOver = false;

    for (const c of celulas) {
        // Boost decelerado
        c.vx *= FRICCION;
        c.vy *= FRICCION;

        // Movimiento constante hacia el ratón
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

        // Aplicar boost
        c.x += c.vx;
        c.y += c.vy;

        // Límites con barras negras
        const r = c.diameter / 2;
        c.x = Math.max(BARRA + r, Math.min(c.x, cuadrado.offsetWidth  - BARRA - r));
        c.y = Math.max(BARRA + r, Math.min(c.y, cuadrado.offsetHeight - BARRA - r));

        // Actualizar posición DOM
        c.el.style.left = c.x + 'px';
        c.el.style.top  = c.y + 'px';

        // Cursor oculto si el ratón está encima
        const sx = c.x + rect.left;
        const sy = c.y + rect.top;
        if (Math.sqrt((mouseClientX - sx) ** 2 + (mouseClientY - sy) ** 2) < r) {
            anyOver = true;
        }
    }

    cuadrado.style.cursor = anyOver ? 'none' : 'crosshair';

    // Separación física: las células no pueden solaparse
    separateCells();

    checkColisiones();
    checkFusiones();
    updateMinimapa();

    requestAnimationFrame(animate);
}

// ── Separación física entre células ──────────────────────────────────────────
// Empuja las células que se solapan hasta que se toquen en el borde (sin penetración)
function separateCells() {
    for (let i = 0; i < celulas.length; i++) {
        for (let j = i + 1; j < celulas.length; j++) {
            const a  = celulas[i];
            const b  = celulas[j];
            const ra = a.diameter / 2;
            const rb = b.diameter / 2;

            const dx   = b.x - a.x;
            const dy   = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const minDist = ra + rb;

            if (dist < minDist) {
                // Cuánto se solapan
                const overlap = minDist - dist;
                // Dirección de separación (normalizada)
                const nx = dx / dist;
                const ny = dy / dist;
                // Cada una se mueve la mitad del solapamiento
                const push = overlap / 2;
                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
            }
        }
    }
}
