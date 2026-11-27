import { settings, onSettingChange } from "./settings.js";

const clickAudio = new Audio(new URL("../sfx/button_click.mp3", import.meta.url));
const hoverAudio = new Audio(new URL("../sfx/button_hover.mp3", import.meta.url));

const curve = () => Math.pow(settings.sfxVolume / 100, 2); // perceptual volume curve

function playFile(audio, base = 0.8) {
    const v = curve() * base;
    if (v <= 0) return;
    audio.volume = Math.min(1, v);
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

/* ---------------- Web Audio plumbing ---------------- */
let ctx = null, master = null, noiseBuf = null;

function getCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = curve();
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
}

onSettingChange((key) => {
    if (master && (key === "sfxVolume" || key === "*")) master.gain.setTargetAtTime(curve(), ctx.currentTime, 0.02);
});

// browsers only allow audio after a click/key press
for (const ev of ["pointerdown", "keydown"]) {
    window.addEventListener(ev, () => {
        const c = getCtx();
        if (c && c.state === "suspended") c.resume().then(syncAmbience).catch(() => {});
    }, { capture: true, passive: true });
}

function run(fn) {
    const c = getCtx();
    if (!c || curve() <= 0) return;
    if (c.state === "running") return fn(c.currentTime);
    const asked = performance.now();
    c.resume().then(() => { if (performance.now() - asked < 250) fn(c.currentTime); }).catch(() => {});
}

function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(t0, { f = 440, to, type = "square", dur = 0.1, vol = 0.1, at = 0, attack = 0.004 }) {
    const t = t0 + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, vol, attack, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
}

function noise(t0, { dur = 0.1, vol = 0.1, at = 0, type = "bandpass", f = 2000, to, q = 1, attack = 0.004 }) {
    const t = t0 + at;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    env(g, t, vol, attack, dur);
    s.connect(filter).connect(g).connect(master);
    s.start(t, Math.random() * 1.5, dur + 0.05);
}

/* ---------------- The sounds (tweak the numbers to taste) ---------------- */
const S = {
    // settings / gear
    gear(t) {
        for (let i = 0; i < 6; i++) {
            noise(t, { at: i * 0.05, dur: 0.03, vol: 0.12, f: 3000 + i * 250, q: 4 });
            tone(t, { at: i * 0.05, f: 180 + i * 30, to: 120 + i * 20, dur: 0.04, vol: 0.05 });
        }
        tone(t, { at: 0.3, f: 900, to: 700, type: "triangle", dur: 0.12, vol: 0.05 });
    },
    gearClose(t) {
        tone(t, { f: 800, to: 600, type: "triangle", dur: 0.1, vol: 0.05 });
        for (let i = 0; i < 5; i++) {
            noise(t, { at: 0.08 + i * 0.045, dur: 0.03, vol: 0.1, f: 4000 - i * 350, q: 4 });
            tone(t, { at: 0.08 + i * 0.045, f: 260 - i * 25, to: 150, dur: 0.04, vol: 0.045 });
        }
    },
    toggle(t, on = true) {
        tone(t, { f: on ? 500 : 380, to: on ? 900 : 260, dur: 0.06, vol: 0.07 });
        noise(t, { dur: 0.015, vol: 0.1, f: 4000, q: 3 });
    },
    tick(t, v = 50) { tone(t, { f: 260 + v * 5, type: "triangle", dur: 0.035, vol: 0.12 }); },

    // paper + pen
    paperSlide(t) {
        noise(t, { dur: 0.55, vol: 0.16, f: 500, to: 2600, q: 0.7, attack: 0.15 });
        noise(t, { at: 0.1, dur: 0.4, vol: 0.06, type: "highpass", f: 3500, attack: 0.1 });
    },
    paperSettle(t) {
        tone(t, { f: 120, to: 60, type: "sine", dur: 0.14, vol: 0.2 });
        noise(t, { dur: 0.12, vol: 0.1, type: "lowpass", f: 900 });
    },
    paperRustle(t) {
        for (let i = 0; i < 7; i++) {
            noise(t, { at: i * 0.045 + Math.random() * 0.02, dur: 0.05, vol: 0.05 + Math.random() * 0.06, type: "highpass", f: 2500 + Math.random() * 2500, q: 0.5 });
        }
    },
    pencilTick(t) {
        noise(t, { dur: 0.02, vol: 0.09, type: "highpass", f: 5000 });
        tone(t, { f: 1500, type: "triangle", dur: 0.02, vol: 0.025 });
    },
    penClick(t) {
        tone(t, { f: 2100, dur: 0.012, vol: 0.07 });
        tone(t, { at: 0.055, f: 1500, dur: 0.014, vol: 0.06 });
    },
    penCircle(t) { // scribbled circle
        for (let i = 0; i < 9; i++) noise(t, { at: i * 0.05, dur: 0.07, vol: 0.09, f: 3700 + Math.sin(i * 1.3) * 900, q: 3, attack: 0.01 });
    },
    penCross(t) { // quick strike-through
        for (let i = 0; i < 3; i++) noise(t, { at: i * 0.075, dur: 0.08, vol: 0.1, f: i % 2 ? 2600 : 4200, to: i % 2 ? 4200 : 2600, q: 2.5, attack: 0.01 });
    },

    // people
    footstep(t, v = 1) {
        noise(t, { dur: 0.07, vol: 0.2 * v, type: "lowpass", f: 420, attack: 0.003 });
        tone(t, { f: 95, to: 50, type: "sine", dur: 0.08, vol: 0.18 * v });
    },
    blip(t, pitch = 300) { tone(t, { f: pitch * (0.94 + Math.random() * 0.12), dur: 0.05, vol: 0.05 }); },
    pop(t) { tone(t, { f: 320, to: 760, type: "sine", dur: 0.09, vol: 0.12 }); },

    // feedback
    timerTick(t, left = 5) { tone(t, { f: left <= 2 ? 1500 : 1100, dur: 0.035, vol: 0.06 }); },
    alert(t) {
        tone(t, { f: 880, dur: 0.1, vol: 0.07 });
        tone(t, { at: 0.14, f: 660, dur: 0.14, vol: 0.07 });
    },
    statUp(t) { tone(t, { f: 520, to: 780, dur: 0.07, vol: 0.06 }); },
    statDown(t) { tone(t, { f: 420, to: 260, dur: 0.09, vol: 0.06 }); },
    chime(t) { [523, 659, 784, 1047].forEach((f, i) => tone(t, { at: i * 0.09, f, type: "triangle", dur: 0.28, vol: 0.1 })); },
    gameOver(t) {
        tone(t, { f: 340, to: 50, type: "sawtooth", dur: 1.1, vol: 0.12 });
        noise(t, { dur: 0.9, vol: 0.08, type: "lowpass", f: 900, to: 100 });
    },

    // CRT page transitions
    crtZoomIn(t) {
        tone(t, { f: 90, to: 2400, type: "sawtooth", dur: 0.6, vol: 0.05 });
        noise(t, { dur: 0.6, vol: 0.1, type: "highpass", f: 1000, to: 6000, attack: 0.3 });
    },
    crtZoomOut(t) {
        tone(t, { f: 2400, to: 80, type: "sawtooth", dur: 0.8, vol: 0.045 });
        noise(t, { dur: 0.7, vol: 0.08, type: "highpass", f: 6000, to: 1000, attack: 0.05 });
        tone(t, { at: 0.6, f: 60, type: "sine", dur: 0.25, vol: 0.15 });
    },

    // one "stinger" per day theme, played by the day intro card
    stinger_morning(t) {
        [0, 0.14, 0.34].forEach(at => tone(t, { at, f: 2600, to: 3700, type: "sine", dur: 0.08, vol: 0.07 }));
        S.chime(t + 0.5);
    },
    stinger_office(t) { S.chime(t); },
    stinger_rain(t) {
        noise(t, { at: 0.05, dur: 0.07, vol: 0.2, type: "highpass", f: 3000 });
        noise(t, { at: 0.12, dur: 1.8, vol: 0.3, type: "lowpass", f: 180, attack: 0.2 });
    },
    stinger_halloween(t) {
        tone(t, { f: 196, to: 185, type: "triangle", dur: 1.4, vol: 0.1 });
        tone(t, { at: 0.1, f: 233, to: 220, type: "sine", dur: 1.3, vol: 0.07 });
        noise(t, { at: 0.2, dur: 0.6, vol: 0.06, f: 300, to: 900, q: 8 });
    },
    stinger_blackfriday(t) {
        noise(t, { dur: 0.03, vol: 0.15, f: 4000, q: 3 });
        tone(t, { at: 0.06, f: 2093, type: "sine", dur: 0.6, vol: 0.09 });
        tone(t, { at: 0.12, f: 3136, type: "sine", dur: 0.6, vol: 0.07 });
    },
    stinger_midnight(t) {
        [0, 0.9].forEach(at => {
            tone(t, { at, f: 196, type: "sine", dur: 1.4, vol: 0.2 });
            tone(t, { at, f: 392, type: "sine", dur: 0.9, vol: 0.06 });
        });
    },
    stinger_finale(t) {
        tone(t, { f: 55, type: "sawtooth", dur: 2, vol: 0.07 });
        tone(t, { f: 220, to: 440, type: "sine", dur: 1.8, vol: 0.06 });
        S.chime(t + 1.5);
    }
};

export function play(name, ...args) {
    const fn = S[name];
    if (fn) run(t => fn(t, ...args));
}

// walking: `count` steps, getting louder (rising) or quieter
export function footsteps(count = 5, interval = 330, rising = true) {
    for (let i = 0; i < count; i++) {
        const k = count > 1 ? i / (count - 1) : 1;
        setTimeout(() => play("footstep", rising ? 0.45 + 0.55 * k : 1 - 0.6 * k), i * interval);
    }
}

/* ---------------- Ambience (looped noise under the sfx volume) ---------------- */
const AMBIENCE = {
    rain: { type: "bandpass", f: 1400, q: 0.4, vol: 0.07 },
    wind: { type: "lowpass", f: 500, q: 1, vol: 0.06 },
    hum: { type: "lowpass", f: 120, q: 1, vol: 0.1 }
};
let wanted = null, amb = null;

export function setAmbience(kind) {
    wanted = kind;
    syncAmbience();
}

function syncAmbience() {
    const c = getCtx();
    if (!c) return;
    if (amb && amb.kind !== wanted) {
        const old = amb;
        amb = null;
        old.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
        setTimeout(() => { try { old.src.stop(); } catch { /* already stopped */ } }, 1500);
    }
    if (wanted && !amb && c.state === "running") {
        const cfg = AMBIENCE[wanted];
        const src = c.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const filter = c.createBiquadFilter();
        filter.type = cfg.type;
        filter.frequency.value = cfg.f;
        filter.Q.value = cfg.q;
        const gain = c.createGain();
        gain.gain.value = 0.0001;
        gain.gain.setTargetAtTime(cfg.vol, c.currentTime, 0.5);
        src.connect(filter).connect(gain).connect(master);
        src.start();
        amb = { kind: wanted, src, gain };
    }
}

/* ---------------- Button sounds for the whole page ----------------
   Any element with class "btn" gets hover + click sounds automatically.
   data-sfx="gear"  -> plays that synthesized sound on click instead of the mp3
   data-sfx="none"  -> no click sound (the element plays its own)                */
export function initUiSounds() {
    document.addEventListener("mouseover", (e) => {
        const b = e.target.closest?.(".btn");
        if (!b || b.disabled || b.contains(e.relatedTarget)) return;
        playFile(hoverAudio);
    });
    document.addEventListener("click", (e) => {
        const b = e.target.closest?.(".btn");
        if (!b || b.disabled) return;
        const kind = b.dataset.sfx;
        if (kind === "none") return;
        if (kind) play(kind);
        else playFile(clickAudio);
    });
}