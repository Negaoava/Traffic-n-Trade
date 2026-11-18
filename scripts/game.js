import cards from "./cards.json" with {type: "json"};
import { buttonClickSFX, buttonHoverSFX } from "./main_menu.js";
import { navigateWithTransition } from "./transition.js";

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

/* ---------------- NPCs ----------------
   Each card picks an NPC. Optional fields you can add to any card in cards.json:
     "npc": "fiscal"                  -> forces a specific NPC (keys below)
     "flavor": "Chefe, preciso..."    -> custom line the NPC says before handing the paper
   Without them, the NPC is picked by card.category (if it matches a pillar name)
   or randomly, and says one of its own lines. */
const NPCS = {
    financeira: {
        name: "Sra. Almeida", role: "Financeira",
        look: { skin: "#c3e0c4", hair: "#162016", hairH: 5, suit: "#4a5a4e", tie: "#a3cfa4" },
        lines: ["Com licença, chefe. Os números não estão bonitos hoje.", "Preciso de uma assinatura sua. Rápido, por favor."]
    },
    fiscal: {
        name: "Sr. Barros", role: "Fiscal do governo",
        look: { skin: "#a9cdaa", hair: "#2a3a2a", hairH: 3, suit: "#2f3a33", tie: "#8b3a3a" },
        lines: ["Bom dia. Tenho algumas perguntas sobre a sua empresa.", "Isto é só uma visita de rotina. Por enquanto."]
    },
    investidor: {
        name: "Dr. Valente", role: "Investidor",
        look: { skin: "#d2e8d3", hair: "#6f7f70", hairH: 4, suit: "#3a4a60", tie: "#c9d8a0" },
        lines: ["Estou de olho no meu dinheiro, sabe como é.", "Tenho uma proposta. Você vai querer ouvir."]
    },
    cliente: {
        name: "Dona Marta", role: "Cliente antiga",
        look: { skin: "#b6d6b7", hair: "#8a9a8b", hairH: 6, suit: "#5a4a50", tie: "#a3cfa4" },
        lines: ["Eu venho aqui há anos, e olha só o que aconteceu!", "Será que o senhor pode resolver isso pra mim?"]
    },
    atendente: {
        name: "Caio", role: "Atendimento",
        look: { skin: "#8fb890", hair: "#162016", hairH: 5, suit: "#4a6a5a", tie: "#72a373" },
        lines: ["Chefe, o telefone não para de tocar!", "Tem uma situação na recepção. Posso explicar?"]
    },
    assessor: {
        name: "Dra. Lúcia", role: "Assessora jurídica",
        look: { skin: "#c3e0c4", hair: "#3a2a2a", hairH: 6, suit: "#2a2f35", tie: "#e0e0e0" },
        lines: ["Antes de decidir, leia isto com atenção.", "Juridicamente, estamos pisando em ovos."]
    },
    estagiario: {
        name: "Téo", role: "Estagiário",
        look: { skin: "#a3cfa4", hair: "#4a3a1a", hairH: 4, suit: "#6a7a5a", tie: "#c96a6a" },
        lines: ["Ahn... acho que ninguém mais quis trazer isso pro senhor.", "Desculpa interromper! É meio urgente, eu acho."]
    }
};

const NPC_BY_CATEGORY = {
    Governo: ["fiscal", "assessor"],
    Investidores: ["financeira", "investidor"],
    Clientes: ["cliente", "atendente"],
    Concorrência: ["assessor", "estagiario"]
};

/* ---------------- Elements ---------------- */
const screen = document.getElementById("game-screen");
const hud = document.getElementById("hud");
const pauseBtn = document.getElementById("pause-btn");
const scene = document.getElementById("scene");
const npc = document.getElementById("npc");
const speech = document.getElementById("speech");
const speechName = document.getElementById("speech-name");
const speechText = document.getElementById("speech-text");
const paper = document.getElementById("paper");
const paperTitle = document.getElementById("paper-title");
const paperText = document.getElementById("paper-text");
const optionBtns = { A: document.getElementById("opt-A"), B: document.getElementById("opt-B") };
const optTexts = { A: document.getElementById("opt-A-text"), B: document.getElementById("opt-B-text") };

/* ---------------- State ---------------- */
let pillars;
let dayStartPillars;
let day;
let choicesMade;
let pickedCard;
let lastCardId = null;
let lastNpcKey = null;
let overlayOpen = false;
let paperReady = false;
let skipTyping = null;

/* ---------------- Helpers ---------------- */
function clamp(value) {
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function playSfx(audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// sleeps, and also waits while a pause/options overlay is open
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms)).then(async () => {
        while (overlayOpen) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    });
}

function waitAnimation(el, fallbackMs = 3000) {
    return new Promise(resolve => {
        const done = () => {
            el.removeEventListener("animationend", onEnd);
            clearTimeout(timer);
            resolve();
        };
        const onEnd = (e) => {
            if (e.target === el) done();
        };
        const timer = setTimeout(done, fallbackMs);
        el.addEventListener("animationend", onEnd);
    });
}

function typeText(el, text, speed = 28) {
    return new Promise(resolve => {
        let i = 0;
        el.textContent = "";
        const timer = setInterval(() => {
            i++;
            el.textContent = text.slice(0, i);
            if (i >= text.length) finish();
        }, speed);

        function finish() {
            clearInterval(timer);
            el.textContent = text;
            skipTyping = null;
            resolve();
        }

        skipTyping = finish;
    });
}

function refreshOptions() {
    const disabled = !paperReady || overlayOpen;
    optionBtns.A.disabled = disabled;
    optionBtns.B.disabled = disabled;
}

/* ---------------- Game rules ---------------- */
function pickCard() {
    const ids = Object.keys(cards);
    let id;
    do {
        id = ids[Math.floor(Math.random() * ids.length)];
    } while (ids.length > 1 && id === lastCardId);
    lastCardId = id;
    return cards[id];
}

function pickNpc(card) {
    const all = Object.keys(NPCS);
    let key;
    if (card.npc && NPCS[card.npc]) {
        key = card.npc;
    } else {
        const pool = (NPC_BY_CATEGORY[card.category] || all).filter(k => k !== lastNpcKey);
        key = randomItem(pool.length ? pool : all);
    }
    lastNpcKey = key;
    return NPCS[key];
}

function updateHud() {
    hud.innerText = `Dia ${day} - Escolha ${Math.min(choicesMade + 1, CHOICES_PER_DAY)}/${CHOICES_PER_DAY}`;
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

/* ---------------- NPC ---------------- */
async function npcEnter(data) {
    const fromRight = Math.random() < 0.5;
    npc.style.setProperty("--from", fromRight ? "60vw" : "-60vw");
    npc.style.setProperty("--to", fromRight ? "-60vw" : "60vw");

    npc.style.setProperty("--skin", data.look.skin);
    npc.style.setProperty("--hair", data.look.hair);
    npc.style.setProperty("--hair-h", data.look.hairH);
    npc.style.setProperty("--suit", data.look.suit);
    npc.style.setProperty("--tie", data.look.tie);

    npc.className = "npc walking-in";
    await waitAnimation(npc, 2200);
    npc.className = "npc standing";
}

async function npcLeave() {
    npc.className = "npc walking-out";
    await waitAnimation(npc, 1600);
    npc.className = "npc";
}

/* ---------------- Paper ---------------- */
function fillPaper(card) {
    paperTitle.textContent = card.title || "Memorando";
    paperText.textContent = card.text;
    optTexts.A.textContent = card.options.A.text;
    optTexts.B.textContent = card.options.B.text;
    optionBtns.A.classList.remove("chosen", "crossed");
    optionBtns.B.classList.remove("chosen", "crossed");
}

function openPaper() {
    paper.classList.add("active");
    scene.classList.add("zoomed");
}

function closePaper() {
    paper.classList.remove("active");
    scene.classList.remove("zoomed");
}

/* ---------------- Turn flow ---------------- */
async function nextCard() {
    paperReady = false;
    refreshOptions();

    pickedCard = pickCard();
    const data = pickNpc(pickedCard);
    updateHud();

    await npcEnter(data);

    speechName.textContent = `${data.name} · ${data.role}`;
    speechText.textContent = "";
    speech.classList.add("visible");
    await typeText(speechText, pickedCard.flavor || randomItem(data.lines));
    await sleep(800);
    speech.classList.remove("visible");

    fillPaper(pickedCard);
    openPaper();
    await sleep(1000);

    paperReady = true;
    refreshOptions();
}

async function handleChoice(choice) {
    if (overlayOpen || !paperReady) return;

    paperReady = false;
    refreshOptions();

    const other = choice === "A" ? "B" : "A";
    optionBtns[choice].classList.add("chosen");

    applyEffects(pickedCard, choice);
    choicesMade++;

    await sleep(450);
    optionBtns[other].classList.add("crossed");
    await sleep(1100);

    closePaper();
    await sleep(900);
    await npcLeave();

    advance();
}

function advance() {
    const reason = checkGameOver();
    if (reason) {
        showGameOver(reason);
        return;
    }

    if (choicesMade >= CHOICES_PER_DAY) {
        endDay();
        return;
    }

    nextCard();
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

function resetScene() {
    paperReady = false;
    closePaper();
    speech.classList.remove("visible");
    npc.className = "npc";
    refreshOptions();
}

function startNextDay() {
    day++;
    choicesMade = 0;
    dayStartPillars = { ...pillars };
    closeOverlay();
    resetScene();
    nextCard();
}

function startGame() {
    pillars = { ...START_PILLARS };
    dayStartPillars = { ...START_PILLARS };
    day = 1;
    choicesMade = 0;
    closeOverlay();
    resetScene();
    nextCard();
}

/* ---------------- Overlays ---------------- */
function closeOverlay() {
    const existing = document.querySelector(".overlay");
    if (existing) existing.remove();
    overlayOpen = false;
    refreshOptions();
}

function createOverlay(titleText) {
    closeOverlay();
    overlayOpen = true;
    refreshOptions();

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    const title = document.createElement("h2");
    title.className = "overlay-title";
    title.innerText = titleText;

    panel.appendChild(title);
    overlay.appendChild(panel);
    screen.appendChild(overlay);
    return panel;
}

function createButton(label, onClick) {
    const button = document.createElement("button");
    button.className = "option-btn btn";
    button.type = "button";
    button.innerText = label;

    button.addEventListener("click", () => {
        playSfx(buttonClickSFX);
        onClick();
    });

    button.addEventListener("mouseenter", () => playSfx(buttonHoverSFX));

    return button;
}

function showPauseMenu() {
    const panel = createOverlay("PAUSED");

    panel.appendChild(createButton("RESUME", closeOverlay));
    panel.appendChild(createButton("OPTIONS", showOptions));
    panel.appendChild(createButton("MAIN MENU", () => navigateWithTransition("index.html")));
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

/* ---------------- Events ---------------- */
for (const key of ["A", "B"]) {
    optionBtns[key].addEventListener("click", () => {
        if (optionBtns[key].disabled) return;
        playSfx(buttonClickSFX);
        handleChoice(key);
    });

    optionBtns[key].addEventListener("mouseenter", () => {
        if (!optionBtns[key].disabled) playSfx(buttonHoverSFX);
    });
}

// click the scene or press Space/Enter to skip the NPC's typing
scene.addEventListener("click", () => skipTyping && skipTyping());
document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && skipTyping) skipTyping();
});

pauseBtn.addEventListener("click", () => {
    if (!overlayOpen) {
        showPauseMenu();
    }
});

startGame();