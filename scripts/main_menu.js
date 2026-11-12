
export const buttonHoverSFX = new Audio('../sfx/button_hover.mp3');
export const buttonClickSFX = new Audio('../sfx/button_click.mp3');

const buttons = document.querySelectorAll('.btn');

const optionsBtn = document.querySelector('.options-btn');
const closeOptionsBtn = document.querySelector('.close-menu-btn');
const optionsMenu = document.querySelector('.options-menu');
const blackOverlay = document.querySelector('.black-overlay');
const startBtn = document.querySelector('.start-btn');

buttonHoverSFX.volume = 0.8;
buttonClickSFX.volume = 0.8;

// Options menu
if (optionsBtn && blackOverlay && optionsMenu) {
    optionsBtn.addEventListener('click', () => {
        blackOverlay.classList.add('black-overlay-active');
        optionsMenu.classList.add('options-menu-active');
    });
}

// Close options menu
if (closeOptionsBtn && blackOverlay && optionsMenu) {
    closeOptionsBtn.addEventListener('click', () => {
        blackOverlay.classList.remove('black-overlay-active');
        optionsMenu.classList.remove('options-menu-active');
    });
}

// Button sound effects
buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
        buttonHoverSFX.currentTime = 0;
        buttonHoverSFX.play();
    });

    button.addEventListener('click', () => {
        buttonClickSFX.currentTime = 0;
        buttonClickSFX.play();
    });
});
