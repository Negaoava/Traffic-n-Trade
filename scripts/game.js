import cards from "./cards.json" with { type: "json" };
import specialCards from "./special_cards.json" with { type: "json" };
import { navigateWithTransition } from "./transition.js";
import { settings, TEXT_SPEEDS } from "./settings.js";
import { play, footsteps, setAmbience, initUiSounds } from "./sfx.js";
import { initCursor, initCamera } from "./fx.js";
import { buildOptionsPanel } from "./options_panel.js";
import { WEEK, DAYS_IN_WEEK, TIMEOUT_PENALTY, drawCard, rollEffects, evaluateEnding, hasFlagReq } from "./rules.js";
import { playMusic, stopMusic, musicForTheme } from "./music.js";

const allCards = { ...cards, ...specialCards };

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

// background sound for each day theme (see sfx.js)
const AMBIENCE = { rain: "rain", halloween: "wind", midnight: "hum" };

/* ---------------- NPCs ----------------
   Optional fields you can add to any card (cards.json / special_cards.json):
     "npc": "fiscal"                  -> forces a specific NPC (keys below)
     "flavor": "Chefe, preciso..."    -> custom line the NPC says before handing the paper
   "voice" is the pitch (Hz) of the talking blips. */
const NPCS = {
    financeira: {
        name: "Sra. Almeida", role: "Financeira", voice: 330,
        look: { skin: "#c3e0c4", hair: "#162016", hairH: 5, suit: "#4a5a4e", tie: "#a3cfa4" },
        lines: ["Com licença, chefe. Os números não estão bonitos hoje.", "Preciso de uma assinatura sua. Rápido, por favor."]
    },
    fiscal: {
        name: "Sr. Barros", role: "Fiscal do governo", voice: 190,
        look: { skin: "#a9cdaa", hair: "#2a3a2a", hairH: 3, suit: "#2f3a33", tie: "#8b3a3a" },
        lines: ["Bom dia. Tenho algumas perguntas sobre a sua empresa.", "Isto é só uma visita de rotina. Por enquanto."]
    },
    investidor: {
        name: "Dr. Valente", role: "Investidor", voice: 220,
        look: { skin: "#d2e8d3", hair: "#6f7f70", hairH: 4, suit: "#3a4a60", tie: "#c9d8a0" },
        lines: ["Estou de olho no meu dinheiro, sabe como é.", "Tenho uma proposta. Você vai querer ouvir."]
    },
    cliente: {
        name: "Dona Marta", role: "Cliente antiga", voice: 400,
        look: { skin: "#b6d6b7", hair: "#8a9a8b", hairH: 6, suit: "#5a4a50", tie: "#a3cfa4" },
        lines: ["Eu venho aqui há anos, e olha só o que aconteceu!", "Será que o senhor pode resolver isso pra mim?"]
    },
    atendente: {
        name: "Caio", role: "Atendimento", voice: 280,
        look: { skin: "#8fb890", hair: "#162016", hairH: 5, suit: "#4a6a5a", tie: "#72a373" },
        lines: ["Chefe, o telefone não para de tocar!", "Tem uma situação na recepção. Posso explicar?"]
    },
    assessor: {
        name: "Dra. Lúcia", role: "Assessora jurídica", voice: 360,
        look: { skin: "#c3e0c4", hair: "#3a2a2a", hairH: 6, suit: "#2a2f35", tie: "#e0e0e0" },
        lines: ["Antes de decidir, leia isto com atenção.", "Juridicamente, estamos pisando em ovos."]
    },
    estagiario: {
        name: "Téo", role: "Estagiário", voice: 450,
        look: { skin: "#a3cfa4", hair: "#4a3a1a", hairH: 4, suit: "#6a7a5a", tie: "#c96a6a" },
        lines: ["Ahn... acho que ninguém mais quis trazer isso pro senhor.", "Desculpa interromper! É meio urgente, eu acho."]
    },
    jornalista: {
        name: "Helena Prado", role: "Repórter", voice: 380,
        look: { skin: "#c3e0c4", hair: "#5a2a2a", hairH: 6, suit: "#3a4a4a", tie: "#c9d8a0" },
        lines: ["Só algumas perguntas, senhor gestor.", "Tenho fontes. Muitas fontes."]
    },
    entregador: {
        name: "Zeca", role: "Entregador", voice: 240,
        look: { skin: "#8fb890", hair: "#162016", hairH: 4, suit: "#6a4a2a", tie: "#a3cfa4" },
        lines: ["Chefe, posso falar um minuto?", "A rua tá difícil, e o pessoal também."]
    },
    mascarado: {
        name: "???", role: "Visitante fantasiado", voice: 150,
        look: { skin: "#d8e8d0", hair: "#1a1a2a", hairH: 7, suit: "#2a1f33", tie: "#e8903a" },
        lines: ["Buuu! Brincadeira. Vim fazer negócio.", "Fantasia nova. Gostou?"]
    },
    anonimo: {
        name: "Desconhecido", role: "Remetente anônimo", voice: 110,
        look: { skin: "#1a241a", hair: "#0a0f0a", hairH: 6, suit: "#0d140d", tie: "#0d140d" },
        lines: ["...", "Você recebeu a mensagem?"]
    },
    presidente: {
        name: "Sr. Moreira", role: "Presidente do conselho", voice: 170,
        look: { skin: "#b6d6b7", hair: "#9aa89a", hairH: 4, suit: "#1f2a35", tie: "#8b3a3a" },
        lines: ["O conselho está de olho no senhor.", "Precisamos conversar. Sente-se."]
    }
};

const NPC_BY_CATEGORY = {
    operations: ["atendente", "financeira"], business: ["investidor", "financeira"], clients: ["cliente", "atendente"],
    technology: ["estagiario", "assessor"], work_and_safety: ["entregador", "assessor"], governance: ["assessor", "investidor"],
    regulation: ["fiscal", "assessor"], competition: ["assessor", "estagiario"], environment: ["fiscal", "estagiario"],
    security: ["assessor", "fiscal"], investors: ["investidor", "financeira"], government: ["fiscal", "assessor"],
    expansion: ["investidor", "financeira"], supply_chain: ["atendente", "entregador"], innovation: ["estagiario", "investidor"],
    marketing: ["atendente", "estagiario"], finance: ["financeira", "investidor"], social_responsibility: ["cliente", "estagiario"],
    privacy: ["assessor", "cliente"], legal: ["assessor", "fiscal"], strategy: ["investidor", "presidente"]
};

// extra things NPCs say depending on the day (used ~45% of the time when a card has no "flavor")
const THEME_LINES = {
    morning: ["Bom dia, chefe! Café primeiro, problemas depois.", "Chegou cedo hoje. Eu também, infelizmente."],
    rain: ["Desculpa a poça no chão, chefe. Lá fora é um rio.", "O guarda-chuva quebrou. As entregas também."],
    halloween: ["Doces ou travessuras, chefe! Não repara na fantasia, o RH insistiu.", "Feliz Halloween! Mas a notícia não é feliz."],
    blackfriday: ["O telefone não para! Black Friday é isso!", "Os pedidos dobraram de novo. Preciso de uma decisão!"],
    midnight: ["Meia-noite e ainda aqui... só pode ser coisa séria.", "Desculpe a hora, chefe. Isso não podia esperar."],
    finale: ["Hoje é o dia, chefe. Todo mundo está olhando para o senhor.", "O conselho já está na sala ao lado."]
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
const paperResult = document.getElementById("paper-result");
const timerEl = document.getElementById("paper-timer");
const timerFill = document.getElementById("paper-timer-fill");
const optionBtns = { A: document.getElementById("opt-A"), B: document.getElementById("opt-B") };
const optTexts = { A: document.getElementById("opt-A-text"), B: document.getElementById("opt-B-text") };

initUiSounds();
initCursor();
const camera = initCamera({
    layers: [
        { el: document.getElementById("camera"), k: 1 },
        { el: document.querySelector(".wall"), k: -0.55, extra: true }, // far layer moves less...
        { el: document.querySelector(".desk"), k: 0.3, extra: true },
        { el: paper, k: 0.45, extra: true }                              // ...near layers move more
    ]
});

/* ---------------- State ---------------- */
let pillars;
let dayStartPillars;
let day;
let dayCfg = WEEK[0];
let choicesMade;
let totalChoices;
let pickedCard;
let lastNpcKey = null;
let lastCategory = null;
let flags;      // flags that are active right now (cards can clear them)
let flagsEver;  // every flag set during the run (used by the endings)
let flagTurn;   // flag -> number of choices made when it was set
let used;       // ids of cards already drawn this run
let overlayOpen = false;
let overlayKind = null;
let paperReady = false;
let skipTyping = null;
let timerHandle = null;
let runId = 0; // bumped by the debug day-jump so stale async flows stop themselves

/* ---------------- Helpers ---------------- */
function clamp(value) {
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
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

function typeText(el, text, voice = 300) {
    return new Promise(resolve => {
        const speed = TEXT_SPEEDS[settings.textSpeed] ?? 28;
        el.textContent = "";
        if (!speed) {
            el.textContent = text;
            resolve();
            return;
        }

        let i = 0;
        const timer = setInterval(() => {
            i++;
            el.textContent = text.slice(0, i);
            if (/\S/.test(text[i - 1]) && i % 2 === 1) play("blip", voice);
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

function pillarValues() { // pillars keyed by the english names used in the card files
    const out = {};
    for (const name in PILLAR_CONFIG) out[PILLAR_CONFIG[name].key] = pillars[name];
    return out;
}

/* ---------------- Game rules ---------------- */
function pickCard() {
    const drawn = drawCard(allCards, {
        day, choiceNumber: choicesMade + 1, totalChoices,
        flags, flagTurn, used, lastCategory,
        pillars: pillarValues()
    });
    lastCategory = drawn.card.category;
    return drawn.card;
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
    hud.textContent = `Dia ${day}/${DAYS_IN_WEEK} · ${dayCfg.name} - Escolha ${Math.min(choicesMade + 1, CHOICES_PER_DAY)}/${CHOICES_PER_DAY}`;
}

// Applies one option: scaled/noisy effects, an optional hidden "risk", and flags.
function applyChoice(card, choice) {
    const option = card.options[choice];
    const rolled = rollEffects(option.effects, dayCfg);
    let twist = null;
    let flagsToSet = option.setFlags || [];

    if (option.risk && Math.random() < option.risk.chance) {
        const extra = rollEffects(option.risk.effects, dayCfg);
        for (const key in rolled) rolled[key] += extra[key];
        twist = option.risk.feedback || "Algo deu errado.";
        flagsToSet = flagsToSet.concat(option.risk.setFlags || []);
    }

    let swing = 0;
    for (const name in PILLAR_CONFIG) {
        const change = rolled[PILLAR_CONFIG[name].key] || 0;
        swing = Math.max(swing, Math.abs(change));
        pillars[name] = clamp(pillars[name] + change);
    }

    for (const f of option.clearFlags || []) flags.delete(f);
    for (const f of flagsToSet) {
        flags.add(f);
        flagsEver.add(f);
        flagTurn[f] = totalChoices;
    }
    return { twist, swing };
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
    const run = runId;
    const fromRight = Math.random() < 0.5;
    npc.style.setProperty("--from", fromRight ? "60vw" : "-60vw");
    npc.style.setProperty("--to", fromRight ? "-60vw" : "60vw");

    npc.style.setProperty("--skin", data.look.skin);
    npc.style.setProperty("--hair", data.look.hair);
    npc.style.setProperty("--hair-h", data.look.hairH);
    npc.style.setProperty("--suit", data.look.suit);
    npc.style.setProperty("--tie", data.look.tie);

    npc.className = "npc walking-in";
    footsteps(5, 330, true);
    await waitAnimation(npc, 2200);
    if (run !== runId) return;
    npc.className = "npc standing";
}

async function npcLeave() {
    const run = runId;
    npc.className = "npc walking-out";
    footsteps(4, 300, false);
    await waitAnimation(npc, 1600);
    if (run !== runId) return;
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
    paperResult.classList.remove("show");
    paperResult.textContent = "";
    // cards unlocked by an earlier choice get a stamp
    paper.classList.toggle("consequence", hasFlagReq(card.requirements));
    timerEl.classList.toggle("on", !!dayCfg.timer && settings.timer);
    timerFill.style.transform = "scaleX(1)";
    timerEl.classList.remove("urgent");
}

function openPaper() {
    paper.classList.add("active");
    scene.classList.add("zoomed");
    play("paperSlide");
    setTimeout(() => play("paperSettle"), 750);
}

function closePaper() {
    if (paper.classList.contains("active")) play("paperRustle");
    paper.classList.remove("active");
    scene.classList.remove("zoomed");
}

/* ---------------- Decision timer (day 5+) ---------------- */
function stopTimer() {
    clearInterval(timerHandle);
    timerHandle = null;
}

function startTimer() {
    stopTimer();
    if (!dayCfg.timer || !settings.timer) return;
    const total = dayCfg.timer * 1000;
    let elapsed = 0;
    let lastWhole = Infinity;
    timerHandle = setInterval(() => {
        if (overlayOpen) return; // paused
        elapsed += 250;
        const left = Math.max(0, total - elapsed);
        timerFill.style.transform = `scaleX(${left / total})`;
        timerEl.classList.toggle("urgent", left / total < 0.3);
        const whole = Math.ceil(left / 1000);
        if (whole !== lastWhole) {
            lastWhole = whole;
            if (whole > 0 && whole <= 5) play("timerTick", whole);
        }
        if (left <= 0) {
            stopTimer();
            onTimeout();
        }
    }, 250);
}

function onTimeout() {
    if (!paperReady) return;
    play("alert");
    camera.shake(10, 300);
    for (const name in TIMEOUT_PENALTY) pillars[name] = clamp(pillars[name] + TIMEOUT_PENALTY[name]);
    handleChoice(randomItem(["A", "B"]), { timeout: true });
}

/* ---------------- Turn flow ---------------- */
async function nextCard() {
    const run = runId;
    paperReady = false;
    refreshOptions();

    pickedCard = pickCard();
    const data = pickNpc(pickedCard);
    updateHud();

    await npcEnter(data);
    if (run !== runId) return;

    speechName.textContent = `${data.name} · ${data.role}`;
    speechText.textContent = "";
    speech.classList.add("visible");
    play("pop");
    const themed = THEME_LINES[dayCfg.theme];
    const line = pickedCard.flavor || (themed && Math.random() < 0.45 ? randomItem(themed) : randomItem(data.lines));
    await typeText(speechText, line, data.voice);
    if (run !== runId) return;
    await sleep(800);
    if (run !== runId) return;
    speech.classList.remove("visible");

    fillPaper(pickedCard);
    openPaper();
    if (paper.classList.contains("consequence")) {
        setTimeout(() => { play("alert"); camera.shake(6, 250); }, 800);
    }
    await sleep(1000);
    if (run !== runId) return;

    paperReady = true;
    refreshOptions();
    startTimer();
}

async function handleChoice(choice, { timeout = false } = {}) {
    if (overlayOpen || !paperReady) return;
    const run = runId;

    paperReady = false;
    stopTimer();
    refreshOptions();

    const other = choice === "A" ? "B" : "A";
    optionBtns[choice].classList.add("chosen");
    play("penClick");
    play("penCircle");
    camera.punch(0, choice === "A" ? -260 : 260); // A kicks the camera up, B kicks it down

    choicesMade++;
    totalChoices++;
    const result = applyChoice(pickedCard, choice);
    if (result.swing >= 10) camera.shake(4 + result.swing / 2, 300);

    await sleep(450);
    if (run !== runId) return;
    optionBtns[other].classList.add("crossed");
    play("penCross");

    const note = [timeout && "Tempo esgotado: a decisão foi tomada por você.", result.twist].filter(Boolean).join(" ");
    if (note) {
        paperResult.textContent = note;
        paperResult.classList.add("show");
        play(result.twist ? "alert" : "pop");
        if (result.twist) camera.shake(8, 400);
        await sleep(2400);
    } else {
        await sleep(1100);
    }
    if (run !== runId) return;

    closePaper();
    await sleep(900);
    if (run !== runId) return;
    await npcLeave();
    if (run !== runId) return;

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
    if (day >= DAYS_IN_WEEK) {
        showEnding();
        return;
    }
    showDaySummary(pressure);
}

function resetScene() {
    paperReady = false;
    stopTimer();
    closePaper();
    speech.classList.remove("visible");
    npc.className = "npc";
    refreshOptions();
}

/* ---------------- Days ---------------- */
function applyTheme() {
    screen.dataset.theme = dayCfg.theme;
    const [h, m] = dayCfg.clock;
    // the clock hands start at the day's time (hour hand: 1s = 1 minute, minute hand: 1s = 1 minute)
    screen.style.setProperty("--clock-h", `-${(h % 12) * 60 + m}s`);
    screen.style.setProperty("--clock-m", `-${m}s`);
    setAmbience(AMBIENCE[dayCfg.theme] || null);
    setAmbience(AMBIENCE[dayCfg.theme] || null);
    playMusic(musicForTheme(dayCfg.theme), 1.5); // each day crossfades into its own song
}

async function showDayIntro() {
    const el = document.createElement("div");
    el.className = "day-intro";

    const parts = [
        ["di-kicker", `DIA ${day} DE ${DAYS_IN_WEEK}`],
        ["di-title", dayCfg.name],
        ["di-tag", dayCfg.tag],
        ["di-text", dayCfg.intro]
    ];
    if (dayCfg.timer && settings.timer) parts.push(["di-timer", `TEMPO LIMITE: ${dayCfg.timer}s POR DECISÃO`]);
    for (const [cls, text] of parts) {
        const p = document.createElement("p");
        p.className = cls;
        p.textContent = text;
        el.appendChild(p);
    }
    screen.appendChild(el);
    play(`stinger_${dayCfg.theme}`);

    await new Promise(resolve => {
        const timer = setTimeout(resolve, 3400);
        el.addEventListener("click", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
    el.classList.add("leaving");
    await new Promise(resolve => setTimeout(resolve, 400));
    el.remove();
}

async function beginDay() {
    const run = runId;
    dayCfg = WEEK[Math.min(day, WEEK.length) - 1];
    applyTheme();
    updateHud();
    await showDayIntro();
    if (run !== runId) return;
    nextCard();
}

function startNextDay() {
    day++;
    choicesMade = 0;
    dayStartPillars = { ...pillars };
    closeOverlay();
    resetScene();
    beginDay();
}

function startGame() {
    pillars = { ...START_PILLARS };
    dayStartPillars = { ...START_PILLARS };
    day = 1;
    choicesMade = 0;
    totalChoices = 0;
    lastNpcKey = null;
    lastCategory = null;
    flags = new Set();
    flagsEver = new Set();
    flagTurn = {};
    used = new Set();
    closeOverlay();
    resetScene();
    beginDay();
}

/* ---------------- Overlays ---------------- */
function closeOverlay() {
    const existing = document.querySelector(".overlay");
    if (existing) existing.remove();
    overlayOpen = false;
    overlayKind = null;
    refreshOptions();
}

function createOverlay(titleText, kind = "menu") {
    closeOverlay();
    overlayOpen = true;
    overlayKind = kind;
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

// button sounds are automatic (class "btn"); pass sfx to play a different click sound
function createButton(label, onClick, sfx) {
    const button = document.createElement("button");
    button.className = "option-btn btn";
    button.type = "button";
    button.innerText = label;
    if (sfx) button.dataset.sfx = sfx;
    button.addEventListener("click", onClick);
    return button;
}

function showPauseMenu() {
    const panel = createOverlay("PAUSED", "pause");

    panel.appendChild(createButton("RESUME", closeOverlay));
    panel.appendChild(createButton("OPTIONS", showOptions, "gear"));
    panel.appendChild(createButton("MAIN MENU", () => navigateWithTransition("index.html")));
    panel.appendChild(createButton("QUIT", quitGame));
}

function showOptions() {
    const panel = createOverlay("OPTIONS", "options");

    const body = document.createElement("div");
    body.className = "options-body";
    buildOptionsPanel(body);

    panel.appendChild(body);
    panel.appendChild(createButton("BACK", showPauseMenu, "gearClose"));
}

function quitGame() {
    window.close();
}

function createStatRow(name, from = dayStartPillars) {
    const row = document.createElement("div");
    row.className = "stat-row";

    const header = document.createElement("div");
    header.className = "stat-header";

    const label = document.createElement("span");
    label.innerText = name;

    const value = document.createElement("span");
    const delta = pillars[name] - from[name];
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

function appendStatRows(panel, from) {
    let i = 0;
    for (const name in PILLAR_CONFIG) {
        panel.appendChild(createStatRow(name, from));
        const delta = pillars[name] - from[name];
        if (delta) setTimeout(() => play(delta > 0 ? "statUp" : "statDown"), 350 + i++ * 200);
    }
}

function showDaySummary(pressure) {
    const panel = createOverlay(`Fim do dia ${day}`, "summary");
    play("chime");
    appendStatRows(panel, dayStartPillars);

    if (pressure > 0) {
        const note = document.createElement("p");
        note.className = "overlay-note";
        note.innerText = `A concorrência alta drenou ${pressure} de Clientes e de Investidores.`;
        panel.appendChild(note);
    }

    panel.appendChild(createButton(`Começar dia ${day + 1} · ${WEEK[day].name}`, startNextDay));
}

function showEnding() {
    const ending = evaluateEnding(pillarValues(), flagsEver);
    const panel = createOverlay("Fim da semana", "ending");
    play("chime");

    const name = document.createElement("h3");
    name.className = "overlay-ending";
    name.innerText = ending.title;
    panel.appendChild(name);

    const text = document.createElement("p");
    text.className = "overlay-note";
    text.innerText = ending.text;
    panel.appendChild(text);

    appendStatRows(panel, START_PILLARS);

    const tally = document.createElement("p");
    tally.className = "overlay-note";
    tally.innerText = `Decisões éticas: ${ending.clean} · Decisões duvidosas: ${ending.shady}`;
    panel.appendChild(tally);

    panel.appendChild(createButton("Jogar de novo", startGame));
    panel.appendChild(createButton("Menu principal", () => navigateWithTransition("index.html")));
}

function showGameOver(reason) {
    const panel = createOverlay("Game Over", "gameover");
    play("gameOver");
    stopMusic(0.6);
    camera.shake(14, 700);

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

/* ---------------- Debug menu (C + M) ---------------- */
let debugEl = null;
let debugPrevOpen = false;
const heldKeys = new Set();

function closeDebug() {
    if (!debugEl) return;
    debugEl.remove();
    debugEl = null;
    overlayOpen = debugPrevOpen; // restores whatever overlay was open before
    refreshOptions();
}

function debugJumpToDay(target) {
    runId++; // cancels any in-flight nextCard / handleChoice / beginDay
    day = Math.max(1, Math.min(DAYS_IN_WEEK, target));
    choicesMade = 0;
    totalChoices = (day - 1) * CHOICES_PER_DAY;
    dayStartPillars = { ...pillars };
    lastNpcKey = null;
    lastCategory = null;

    closeDebug();
    closeOverlay();
    document.querySelectorAll(".day-intro").forEach(el => el.remove());
    resetScene();
    beginDay();
}

function openDebug() {
    if (debugEl) return;
    debugPrevOpen = overlayOpen;
    overlayOpen = true;
    refreshOptions();

    debugEl = document.createElement("div");
    debugEl.className = "debug-overlay";

    const panel = document.createElement("div");
    panel.className = "overlay-panel debug-panel";

    const title = document.createElement("h2");
    title.className = "overlay-title";
    title.innerText = "DEBUG";
    panel.appendChild(title);

    // --- pillars ---
    for (const name in PILLAR_CONFIG) {
        const row = document.createElement("div");
        row.className = "debug-row";

        const label = document.createElement("span");
        label.innerText = name;

        const range = document.createElement("input");
        range.type = "range";
        range.min = MIN_VALUE;
        range.max = MAX_VALUE;
        range.value = pillars[name];

        const num = document.createElement("input");
        num.type = "number";
        num.min = MIN_VALUE;
        num.max = MAX_VALUE;
        num.value = pillars[name];

        const apply = (raw) => {
            const v = clamp(Math.round(Number(raw) || 0));
            pillars[name] = v;
            range.value = v;
            if (document.activeElement !== num) num.value = v;
        };
        range.addEventListener("input", () => { apply(range.value); num.value = range.value; });
        num.addEventListener("input", () => apply(num.value));
        num.addEventListener("blur", () => { num.value = pillars[name]; });

        row.append(label, range, num);
        panel.appendChild(row);
    }

    const warn = document.createElement("p");
    warn.className = "overlay-note";
    warn.innerText = "A pillar at 0 or 100 triggers game over on the next choice.";
    panel.appendChild(warn);

    // --- day jump ---
    const dayRow = document.createElement("div");
    dayRow.className = "debug-row debug-day-row";

    const dayLabel = document.createElement("span");
    dayLabel.innerText = "Day";

    const select = document.createElement("select");
    select.className = "debug-select";
    WEEK.forEach((w, i) => {
        const opt = document.createElement("option");
        opt.value = i + 1;
        opt.textContent = `${i + 1} · ${w.name}`;
        if (i + 1 === day) opt.selected = true;
        select.appendChild(opt);
    });

    dayRow.append(dayLabel, select);
    panel.appendChild(dayRow);

    const actions = document.createElement("div");
    actions.className = "debug-actions";
    actions.appendChild(createButton("JUMP TO DAY", () => debugJumpToDay(Number(select.value))));
    actions.appendChild(createButton("CLOSE", closeDebug));
    panel.appendChild(actions);

    debugEl.appendChild(panel);
    screen.appendChild(debugEl);
}

function toggleDebug() {
    if (debugEl) closeDebug();
    else openDebug();
}

window.addEventListener("blur", () => heldKeys.clear());
document.addEventListener("keyup", (e) => heldKeys.delete(e.key.toLowerCase()));


/* ---------------- Mobile debug trigger (3-finger touch) ---------------- */
let debugTouchTriggered = false;

document.addEventListener("touchstart", (e) => {
    if (e.touches.length >= 3 && !debugTouchTriggered) {
        e.preventDefault();

        debugTouchTriggered = true;
        toggleDebug();
    }
}, { passive: false });

function resetDebugTouch(e) {
    if (e.touches.length < 3) {
        debugTouchTriggered = false;
    }
}


document.addEventListener("touchend", resetDebugTouch);
document.addEventListener("touchcancel", resetDebugTouch);


/* ---------------- Events ---------------- */
for (const key of ["A", "B"]) {
    optionBtns[key].addEventListener("click", () => {
        if (!optionBtns[key].disabled) handleChoice(key);
    });

    optionBtns[key].addEventListener("mouseenter", () => {
        if (!optionBtns[key].disabled) play("pencilTick");
    });
}

// click the scene or press Space/Enter to skip the NPC's typing
scene.addEventListener("click", () => skipTyping && skipTyping());

document.addEventListener("keydown", (e) => {
    heldKeys.add(e.key.toLowerCase());

    // debug chord: hold C and M together (any order)
    if (!e.repeat && heldKeys.has("c") && heldKeys.has("m")) {
        e.preventDefault();
        toggleDebug();
        return;
    }

    if (debugEl) {
        if (e.key === "Escape") closeDebug();
        return; // nothing else reacts while the debug menu is open
    }

    if (e.key === "Escape") {
        if (overlayKind === "pause") closeOverlay();
        else if (overlayKind === "options") showPauseMenu();
        else if (!overlayOpen) showPauseMenu();
        return;
    }
    if ((e.key === " " || e.key === "Enter") && skipTyping) skipTyping();

    // keyboard shortcuts for the paper: A / 1 and B / 2
    if (paperReady && !overlayOpen) {
        const k = e.key.toLowerCase();
        if (k === "a" || k === "1") handleChoice("A");
        if (k === "b" || k === "2") handleChoice("B");
    }
});

pauseBtn.addEventListener("click", () => {
    if (!overlayOpen) {
        showPauseMenu();
    }
});

startGame();