
import cards from "./cards.json" with {type: "json"};
import { buttonClickSFX, buttonHoverSFX } from "./main_menu.js";

console.log("GAME.JS LOADED");

const CHOICES_PER_DAY = 15;
const MIN_VALUE = 0;
const MAX_VALUE = 100;
const COMPETITION_THRESHOLD = 50;

const PILLAR_CONFIG = {
    Governo: {
        key: "government",
        minReason: "O governo cassou a sua licença de operação.",
        maxReason: "O governo tomou o controle da sua empresa."
    },
    Investidores: {
        key: "investors",
        minReason: "Os investidores retiraram todo o capital.",
        maxReason: "Os investidores assumiram o controle da empresa."
    },
    Clientes: {
        key: "clients",
        minReason: "Você perdeu todos os seus clientes.",
        maxReason: "A demanda explodiu e você não consegue mais atender os clientes."
    },
    Concorrência: {
        key: "competition",
        minReason: null,
        maxReason: "A concorrência dominou o mercado."
    }
};

const START_PILLARS = {
    Governo: 50,
    Investidores: 50,
    Clientes: 50,
    Concorrência: 40
};

const textBox = document.getElementById("text-box");
const acceptBtn = document.getElementById("accept");
const denyBtn = document.getElementById("deny");
const pauseBtn = document.getElementById("pause-btn");
const gameScreen = document.querySelector(".gameScreen-template-container");

const hud = document.createElement("p");
hud.className = "hud";
gameScreen.prepend(hud);

let pillars;
let dayStartPillars;
let day;
let choicesMade;
let pickedCard;
let lastCardId = null;
let overlayOpen = false;

function clamp(value) {
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

function pickCard() {
    const ids = Object.keys(cards);
    let id;
    do {
        id = ids[Math.floor(Math.random() * ids.length)];
    } while (ids.length > 1 && id === lastCardId);
    lastCardId = id;
    return cards[id];
}

function displayCard(card) {
    textBox.innerText = card.text;
    acceptBtn.innerText = card.options.A.text;
    denyBtn.innerText = card.options.B.text;
}

function updateHud() {
    hud.innerText = `Dia ${day} - Escolha ${Math.min(choicesMade + 1, CHOICES_PER_DAY)}/${CHOICES_PER_DAY}`;
}

function setButtonsDisabled(disabled) {
    acceptBtn.disabled = disabled;
    denyBtn.disabled = disabled;
}

function applyEffects(card, choice) {
    const effects = card.options[choice].effects;
    for (const name in PILLAR_CONFIG) {
        const change = effects[PILLAR_CONFIG[name].key] || 0;
        pillars[name] = clamp(pillars[name] + change);
    }
}

function applyCompetitionPressure() {
    const excess = pillars.Concorrência - COMPETITION_THRESHOLD;
    const pressure = Math.floor(excess / 10);
    if (pressure <= 0) return 0;
    pillars.Clientes = clamp(pillars.Clientes - pressure);
    pillars.Investidores = clamp(pillars.Investidores - pressure);
    return pressure;
}

function checkGameOver() {
    for (const name in PILLAR_CONFIG) {
        const config = PILLAR_CONFIG[name];
        if (config.minReason && pillars[name] <= MIN_VALUE) return config.minReason;
        if (pillars[name] >= MAX_VALUE) return config.maxReason;
    }
    return null;
}

function closeOverlay() {
    const existing = document.querySelector(".overlay");
    if (existing) existing.remove();
    overlayOpen = false;
}

function createOverlay(titleText) {
    closeOverlay();
    overlayOpen = true;
    setButtonsDisabled(true);

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    const title = document.createElement("h2");
    title.className = "overlay-title";
    title.innerText = titleText;

    panel.appendChild(title);
    overlay.appendChild(panel);
    gameScreen.appendChild(overlay);
    return panel;
}

function createButton(label, onClick) {
    const button = document.createElement("button");
    button.className = "option-btn btn";
    button.type = "button";
    button.innerText = label;

    button.addEventListener("click", () => {
        buttonClickSFX.currentTime = 0;
        buttonClickSFX.play();
        onClick();
    });

    button.addEventListener("mouseenter", () => {
        buttonHoverSFX.currentTime = 0;
        buttonHoverSFX.play();
    });

    return button;
}

function showPauseMenu() {
    const panel = createOverlay("PAUSED");

    panel.appendChild(createButton("RESUME", () => {
        closeOverlay();
        setButtonsDisabled(false);
    }));

    panel.appendChild(createButton("OPTIONS", showOptions));

    panel.appendChild(createButton("MAIN MENU", () => {
        window.location.href = "index.html";
    }));

    panel.appendChild(createButton("QUIT", quitGame));
}

function showOptions() {
    const panel = createOverlay("OPTIONS");

    const soundContainer = document.createElement("div");
    soundContainer.className = "pause-slider";

    const soundLabel = document.createElement("p");
    soundLabel.innerText = "SOUND";

    const soundSlider = document.createElement("input");
    soundSlider.type = "range";
    soundSlider.min = 0;
    soundSlider.max = 100;
    soundSlider.value = 100;

    soundContainer.append(soundLabel, soundSlider);

    const musicContainer = document.createElement("div");
    musicContainer.className = "pause-slider";

    const musicLabel = document.createElement("p");
    musicLabel.innerText = "MUSIC";

    const musicSlider = document.createElement("input");
    musicSlider.type = "range";
    musicSlider.min = 0;
    musicSlider.max = 100;
    musicSlider.value = 100;

    musicContainer.append(musicLabel, musicSlider);

    panel.append(soundContainer, musicContainer);

    panel.appendChild(createButton("BACK", showPauseMenu));
}

function quitGame() {
    window.close();
}

function createStatRow(name) {
    const row = document.createElement("div");
    row.className = "stat-row";

    const header = document.createElement("div");
    header.className = "stat-header";

    const label = document.createElement("span");
    label.innerText = name;

    const value = document.createElement("span");
    const delta = pillars[name] - dayStartPillars[name];
    const sign = delta > 0 ? "+" : "";
    value.innerText = `${pillars[name]} (${sign}${delta})`;
    if (delta > 0) value.classList.add("delta-up");
    if (delta < 0) value.classList.add("delta-down");

    header.appendChild(label);
    header.appendChild(value);

    const bar = document.createElement("div");
    bar.className = "stat-bar";

    const fill = document.createElement("div");
    fill.className = "stat-fill";
    if (name === "Concorrência") fill.classList.add("stat-fill-danger");
    fill.style.width = `${pillars[name]}%`;

    bar.appendChild(fill);
    row.appendChild(header);
    row.appendChild(bar);
    return row;
}

function showDaySummary(pressure) {
    const panel = createOverlay(`Fim do dia ${day}`);

    for (const name in PILLAR_CONFIG) {
        panel.appendChild(createStatRow(name));
    }

    if (pressure > 0) {
        const note = document.createElement("p");
        note.className = "overlay-note";
        note.innerText = `A concorrência alta drenou ${pressure} de Clientes e de Investidores.`;
        panel.appendChild(note);
    }

    panel.appendChild(createButton(`Começar dia ${day + 1}`, startNextDay));
}

function showGameOver(reason) {
    const panel = createOverlay("Game Over");

    const text = document.createElement("p");
    text.className = "overlay-note";
    text.innerText = reason;
    panel.appendChild(text);

    const survived = document.createElement("p");
    survived.className = "overlay-note";
    survived.innerText = `Você sobreviveu ${day - 1 + (choicesMade > 0 ? 1 : 0)} dia(s) e fez ${choicesMade} escolha(s) no último dia.`;
    panel.appendChild(survived);

    for (const name in PILLAR_CONFIG) {
        panel.appendChild(createStatRow(name));
    }

    panel.appendChild(createButton("Jogar de novo", startGame));
}

function endDay() {
    const pressure = applyCompetitionPressure();
    const reason = checkGameOver();
    if (reason) {
        showGameOver(reason);
        return;
    }
    showDaySummary(pressure);
}

function startNextDay() {
    day++;
    choicesMade = 0;
    dayStartPillars = { ...pillars };
    closeOverlay();
    setButtonsDisabled(false);
    pickedCard = pickCard();
    displayCard(pickedCard);
    updateHud();
}

function startGame() {
    pillars = { ...START_PILLARS };
    dayStartPillars = { ...START_PILLARS };
    day = 1;
    choicesMade = 0;
    closeOverlay();
    setButtonsDisabled(false);
    pickedCard = pickCard();
    displayCard(pickedCard);
    updateHud();
}

function handleChoice(choice) {
    if (overlayOpen) return;

    applyEffects(pickedCard, choice);
    choicesMade++;

    const reason = checkGameOver();
    if (reason) {
        showGameOver(reason);
        return;
    }

    if (choicesMade >= CHOICES_PER_DAY) {
        endDay();
        return;
    }

    pickedCard = pickCard();
    displayCard(pickedCard);
    updateHud();
}

console.log("oi");

acceptBtn.addEventListener("click", () => handleChoice("A"));
denyBtn.addEventListener("click", () => handleChoice("B"));

pauseBtn.addEventListener("click", () => {
    if (!overlayOpen) {
        showPauseMenu();
    }
});

startGame();
