const cuadrado = document.getElementById('cuadrado');
const circulo = document.getElementById('circulo');
const minimapa = document.getElementById('minimapa');
const miniViewport = document.getElementById('minimapa-viewport');
const miniCirculo = document.getElementById('minimapa-circulo');

let targetX = 1500;
let targetY = 1500;
let currentX = 1500;
let currentY = 1500;

let mouseClientX = window.innerWidth / 2;
let mouseClientY = window.innerHeight / 2;

let scrollVelX = 0;
let scrollVelY = 0;

// Paleta de colores vivos para los puntos
const COLORES = [
    '#ff4757', '#ff6b81', '#ffa502', '#eccc68',
    '#2ed573', '#1e90ff', '#5352ed', '#ff6348',
    '#70a1ff', '#7bed9f', '#ff4500', '#00d2d3',
];

function generarPuntos(cantidad = 400) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < cantidad; i++) {
        const punto = document.createElement('div');
        punto.classList.add('punto');

        // Tamaño muy pequeño: entre 2 y 5 píxeles
        const size = Math.random() * 3 + 2;
        // Color aleatorio de la paleta
        const color = COLORES[Math.floor(Math.random() * COLORES.length)];
        // Posición aleatoria dentro del cuadrado
        const x = Math.random() * cuadrado.offsetWidth;
        const y = Math.random() * cuadrado.offsetHeight;

        punto.style.width  = `${size}px`;
        punto.style.height = `${size}px`;
        punto.style.backgroundColor = color;
        punto.style.left = `${x}px`;
        punto.style.top  = `${y}px`;
        punto.style.opacity = (Math.random() * 0.5 + 0.5).toFixed(2); // entre 0.5 y 1

        fragment.appendChild(punto);
    }
    cuadrado.appendChild(fragment);
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

    // Generamos los puntos aleatorios al cargar
    generarPuntos(400);
};

document.addEventListener('mousemove', (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
});

function calcScrollTarget(mousePos, viewportSize) {
    const zonaInterna = 0.25;
    const relativo = mousePos / viewportSize;

    if (relativo < zonaInterna) {
        return -20 * (1 - relativo / zonaInterna);
    } else if (relativo > (1 - zonaInterna)) {
        return 20 * ((relativo - (1 - zonaInterna)) / zonaInterna);
    }
    return 0;
}

function updateMinimapa() {
    const mapaW = cuadrado.offsetWidth;
    const mapaH = cuadrado.offsetHeight;
    const miniW = minimapa.offsetWidth;
    const miniH = minimapa.offsetHeight;

    // Escala: cuánto representa cada píxel del minimapa en el mundo real
    const scaleX = miniW / mapaW;
    const scaleY = miniH / mapaH;

    // --- Viewport rectangle ---
    // Posición del scroll actual
    const scrollLeft = window.scrollX || window.pageXOffset;
    const scrollTop  = window.scrollY || window.pageYOffset;

    // El cuadrado tiene margen de 50px arriba y a los lados (centrado con margin: auto)
    const cuadradoRect = cuadrado.getBoundingClientRect();
    const cuadradoLeft = cuadradoRect.left + scrollLeft; // offset real del cuadrado en la página
    const cuadradoTop  = cuadradoRect.top  + scrollTop;

    // Posición del viewport relativa al cuadrado
    const vpRelX = scrollLeft - cuadradoLeft;
    const vpRelY = scrollTop  - cuadradoTop;

    miniViewport.style.left   = `${vpRelX * scaleX}px`;
    miniViewport.style.top    = `${vpRelY * scaleY}px`;
    miniViewport.style.width  = `${window.innerWidth  * scaleX}px`;
    miniViewport.style.height = `${window.innerHeight * scaleY}px`;

    // --- Punto del círculo ---
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

    const velocidadCirculo = 0.08;
    currentX += (targetX - currentX) * velocidadCirculo;
    currentY += (targetY - currentY) * velocidadCirculo;

    const radio = circulo.offsetWidth / 2;
    if (currentX < radio) currentX = radio;
    if (currentX > cuadrado.offsetWidth - radio) currentX = cuadrado.offsetWidth - radio;
    if (currentY < radio) currentY = radio;
    if (currentY > cuadrado.offsetHeight - radio) currentY = cuadrado.offsetHeight - radio;

    circulo.style.left = `${currentX}px`;
    circulo.style.top  = `${currentY}px`;

    // --- 3. Actualizar minimapa ---
    updateMinimapa();

    requestAnimationFrame(animate);
}

animate();
