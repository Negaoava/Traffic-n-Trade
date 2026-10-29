const optionsBtn = document.querySelector('.options-btn');
let optionsOpen = false;

optionsBtn.addEventListener('click', () => {
    const blackOverlay = document.querySelector('.black-overlay');

    blackOverlay.classList.add('black-overlay-active');
    console.log(blackOverlay.classList);
})