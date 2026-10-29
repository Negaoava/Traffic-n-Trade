const optionsBtn = document.querySelector('options-btn');
let optionsOpen = false;

optionsBtn.addEventListener('click', () => {
    if (optionsOpen) {
        const blackOverlay = document.querySelector('black-overlay');
        blackOverlay.classList.add('active');
    }
    console.log('click!');
})