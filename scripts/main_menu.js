import "./settings.js";
import { navigateWithTransition } from "./transition.js";
import { initUiSounds } from "./sfx.js";
import { initCursor, initCamera } from "./fx.js";
import { buildOptionsPanel } from "./options_panel.js";
import { playMusic } from "./music.js";
import { buildCredits } from "./credits.js";

initUiSounds();
initCursor();
initCamera({
    layers: [
        { el: document.querySelector(".title-container"), k: 1 },
        { el: document.querySelector(".menu"), k: 0.6, extra: true }
    ]
});

// Mega Man 8 Stage Select (starts on the first click/tap if the browser blocks autoplay)
playMusic("menu", 0.8);

const optionsBtn = document.querySelector('.options-btn');
const closeOptionsBtn = document.querySelector('.close-menu-btn');
const optionsMenu = document.querySelector('.options-menu');
const optionsBody = document.getElementById('options-body');
const creditsBtn = document.querySelector('.credits-btn');
const closeCreditsBtn = document.querySelector('.close-credits-btn');
const creditsMenu = document.querySelector('.credits-menu');
const creditsBody = document.getElementById('credits-body');
const blackOverlay = document.querySelector('.black-overlay');

buildOptionsPanel(optionsBody);
buildCredits(creditsBody);

function closePanels() {
    blackOverlay.classList.remove('black-overlay-active');
    optionsMenu.classList.remove('options-menu-active');
    creditsMenu.classList.remove('options-menu-active');
}

function openPanel(panel) {
    closePanels();
    blackOverlay.classList.add('black-overlay-active');
    panel.classList.add('options-menu-active');
    panel.scrollTop = 0;
}

optionsBtn.addEventListener('click', () => openPanel(optionsMenu));
creditsBtn.addEventListener('click', () => openPanel(creditsMenu));
closeOptionsBtn.addEventListener('click', closePanels);
closeCreditsBtn.addEventListener('click', closePanels);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanels();
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