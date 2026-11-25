import "./settings.js";
import { navigateWithTransition } from "./transition.js";
import { initUiSounds } from "./sfx.js";
import { initCursor, initCamera } from "./fx.js";
import { buildOptionsPanel } from "./options_panel.js";

initUiSounds();
initCursor();
initCamera({
    layers: [
        { el: document.querySelector(".title-container"), k: 1 },
        { el: document.querySelector(".menu"), k: 0.6, extra: true }
    ]
});

const optionsBtn = document.querySelector('.options-btn');
const closeOptionsBtn = document.querySelector('.close-menu-btn');
const optionsMenu = document.querySelector('.options-menu');
const optionsBody = document.getElementById('options-body');
const blackOverlay = document.querySelector('.black-overlay');

buildOptionsPanel(optionsBody);

function openOptions() {
    blackOverlay.classList.add('black-overlay-active');
    optionsMenu.classList.add('options-menu-active');
}

function closeOptions() {
    blackOverlay.classList.remove('black-overlay-active');
    optionsMenu.classList.remove('options-menu-active');
}

optionsBtn.addEventListener('click', openOptions);
closeOptionsBtn.addEventListener('click', closeOptions);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOptions();
});

// Links go through the CRT zoom transition
document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateWithTransition(link.getAttribute('href'));
    });
});

// VCR-style counter in the corner
const clock = document.getElementById('osd-clock');
if (clock) {
    const start = Date.now();
    setInterval(() => {
        const s = Math.floor((Date.now() - start) / 1000);
        clock.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
            .map(n => String(n).padStart(2, '0'))
            .join(':');
    }, 1000);
}