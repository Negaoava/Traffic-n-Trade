/* Player settings: saved in localStorage, applied to <html> as classes. */
const KEY = "tt-settings";
const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
export const hasFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? true;

// phones/tablets and weak machines get the lighter graphics by default ("auto")
const looksWeak = !hasFinePointer || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

// ms per character for the NPC dialogue (0 = instant)
export const TEXT_SPEEDS = { slow: 45, normal: 28, fast: 12, instant: 0 };

const DEFAULTS = {
    sfxVolume: 80,
    musicVolume: 80,      // stored already; plug your music player into onSettingChange later
    quality: "auto",      // "auto" | "high" | "low"
    crt: true,
    flicker: !prefersReduced,
    cursor: true,
    camera: !prefersReduced,
    shake: !prefersReduced,
    textSpeed: "normal",
    timer: true
};

function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export const settings = { ...DEFAULTS, ...load() };
const listeners = new Set();

function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
}

export function isLite() {
    return settings.quality === "low" || (settings.quality !== "high" && looksWeak);
}

export function applySettings() {
    const root = document.documentElement;
    root.classList.toggle("no-crt", !settings.crt);
    root.classList.toggle("no-flicker", !settings.flicker);
    root.classList.toggle("lite", isLite());
    root.classList.toggle("custom-cursor", settings.cursor && hasFinePointer);
}

export function setSetting(key, value) {
    settings[key] = value;
    save();
    applySettings();
    listeners.forEach(fn => fn(key, value));
}

export function resetSettings() {
    Object.assign(settings, DEFAULTS);
    save();
    applySettings();
    listeners.forEach(fn => fn("*", null));
}

// fn(key, value) runs whenever a setting changes ("*" = everything was reset)
export function onSettingChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

applySettings();