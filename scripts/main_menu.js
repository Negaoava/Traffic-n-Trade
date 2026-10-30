const optionsBtn = document.querySelector('.options-btn');
const closeOptionsBtn = document.querySelector('.close-menu-btn');
const optionsMenu = document.querySelector('.options-menu');
const blackOverlay = document.querySelector('.black-overlay');
let optionsOpen = false;

optionsBtn.addEventListener('click', () => {
    blackOverlay.classList.add('black-overlay-active');
    optionsMenu.classList.add('options-menu-active');
})

closeOptionsBtn.addEventListener('click', () => {
    blackOverlay.classList.remove('black-overlay-active');
    optionsMenu.classList.remove('options-menu-active');
})