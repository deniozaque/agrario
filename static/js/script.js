const cuadrado = document.getElementById('cuadrado');
const circulo = document.getElementById('circulo');
const minimapa = document.getElementById('minimapa');
const miniViewport = document.getElementById('minimapa-viewport');
const miniCirculo = document.getElementById('minimapa-circulo');
const contadorEl = document.getElementById('contador-numero');

let score = 0;

let targetX = 1500;
let targetY = 1500;
let currentX = 1500;
let currentY = 1500;

let mouseClientX = window.innerWidth / 2;
let mouseClientY = window.innerHeight / 2;

let scrollVelX = 0;
let scrollVelY = 0;

const TOTAL_PUNTOS = 1500;

// Paleta de colores vivos para los puntos
const COLORES = [
    '#ff4757', '#ff6b81', '#ffa502', '#eccc68',
    '#2ed573', '#1e90ff', '#5352ed', '#ff6348',
    '#70a1ff', '#7bed9f', '#ff4500', '#00d2d3',
    '#ff9f43', '#ee5a24', '#0652DD', '#9980FA',
    '#833471', '#006266', '#F9CA24', '#6ab04c',
];

// Array con datos de cada punto para colisiones sin leer el DOM
const puntos = [];

function crearPunto() {
    const el = document.createElement('div');
    el.classList.add('punto');

    const size = Math.random() * 3 + 2;
    const color = COLORES[Math.floor(Math.random() * COLORES.length)];
    const x = Math.random() * (cuadrado.offsetWidth  - 80) + 40;
    const y = Math.random() * (cuadrado.offsetHeight - 80) + 40;

    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.opacity = (Math.random() * 0.5 + 0.5).toFixed(2);

    cuadrado.appendChild(el);

    return { el, x, y, r: size / 2 };
}

function generarPuntos(cantidad) {
    for (let i = 0; i < cantidad; i++) {
        puntos.push(crearPunto());
    }
}

window.onload = () => {
    window.scrollTo({
        left: (cuadrado.offsetWidth - window.innerWidth) / 2,
        top: (cuadrado.offsetHeight - window.innerHeight) / 2,
        behavior: 'instant'
    });

    targetX = cuadrado.offsetWidth / 2;
    targetY = cuadrado.offsetHeight / 2;
    currentX = targetX;
    currentY = targetY;

    generarPuntos(TOTAL_PUNTOS);
};

document.addEventListener('mousemove', (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
});

function calcScrollTarget(mousePos, viewportSize) {
    const zonaInterna = 0.25;
    const relativo = mousePos / viewportSize;

    if (relativo < zonaInterna) {
        return -7 * (1 - relativo / zonaInterna);
    } else if (relativo > (1 - zonaInterna)) {
        return 7 * ((relativo - (1 - zonaInterna)) / zonaInterna);
    }
    return 0;
}

function checkColisiones() {
    const radioCirculo = circulo.offsetWidth / 2;
    // Recorremos en reversa para poder hacer splice sin saltar índices
    for (let i = puntos.length - 1; i >= 0; i--) {
        const p = puntos[i];
        const dx = currentX - p.x;
        const dy = currentY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radioCirculo + p.r + 2) {
            // Animación de desaparición suave
            p.el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
            p.el.style.transform = 'translate(-50%, -50%) scale(2)';
            p.el.style.opacity = '0';

            // Eliminamos el elemento del DOM tras la animación
            const elRef = p.el;
            setTimeout(() => elRef.remove(), 150);

            // Lo quitamos del array
            puntos.splice(i, 1);

            // Incrementamos el contador
            score++;
            contadorEl.textContent = score;

            // Creamos uno nuevo en otro sitio
            puntos.push(crearPunto());
        }
    }
}

function updateMinimapa() {
    const mapaW = cuadrado.offsetWidth;
    const mapaH = cuadrado.offsetHeight;
    const miniW = minimapa.offsetWidth;
    const miniH = minimapa.offsetHeight;

    const scaleX = miniW / mapaW;
    const scaleY = miniH / mapaH;

    const scrollLeft = window.scrollX || window.pageXOffset;
    const scrollTop  = window.scrollY || window.pageYOffset;

    const cuadradoRect = cuadrado.getBoundingClientRect();
    const cuadradoLeft = cuadradoRect.left + scrollLeft;
    const cuadradoTop  = cuadradoRect.top  + scrollTop;

    const vpRelX = scrollLeft - cuadradoLeft;
    const vpRelY = scrollTop  - cuadradoTop;

    miniViewport.style.left   = `${vpRelX * scaleX}px`;
    miniViewport.style.top    = `${vpRelY * scaleY}px`;
    miniViewport.style.width  = `${window.innerWidth  * scaleX}px`;
    miniViewport.style.height = `${window.innerHeight * scaleY}px`;

    miniCirculo.style.left = `${currentX * scaleX}px`;
    miniCirculo.style.top  = `${currentY * scaleY}px`;
}

function animate() {
    // --- 1. Scroll suavizado ---
    const targetScrollX = calcScrollTarget(mouseClientX, window.innerWidth);
    const targetScrollY = calcScrollTarget(mouseClientY, window.innerHeight);

    scrollVelX += (targetScrollX - scrollVelX) * 0.08;
    scrollVelY += (targetScrollY - scrollVelY) * 0.08;

    if (Math.abs(scrollVelX) > 0.1 || Math.abs(scrollVelY) > 0.1) {
        window.scrollBy(scrollVelX, scrollVelY);
    }

    // --- 2. Movimiento del círculo (lerp) ---
    const rect = cuadrado.getBoundingClientRect();
    targetX = mouseClientX - rect.left;
    targetY = mouseClientY - rect.top;

    const velocidadCirculo = 0.03;
    currentX += (targetX - currentX) * velocidadCirculo;
    currentY += (targetY - currentY) * velocidadCirculo;

    const radio = circulo.offsetWidth / 2;
    if (currentX < radio) currentX = radio;
    if (currentX > cuadrado.offsetWidth - radio) currentX = cuadrado.offsetWidth - radio;
    if (currentY < radio) currentY = radio;
    if (currentY > cuadrado.offsetHeight - radio) currentY = cuadrado.offsetHeight - radio;

    circulo.style.left = `${currentX}px`;
    circulo.style.top  = `${currentY}px`;

    // --- 3. Colisiones con puntos ---
    checkColisiones();

    // --- 4. Actualizar minimapa ---
    updateMinimapa();

    requestAnimationFrame(animate);
}

animate();
