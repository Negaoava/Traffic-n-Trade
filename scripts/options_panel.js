/* One options panel, shared by the main menu and the in-game pause menu. */
import { settings, setSetting, resetSettings } from "./settings.js";
import { play } from "./sfx.js";

const ROWS = [
    { key: "sfxVolume", label: "SOUND", type: "slider" },
    { key: "musicVolume", label: "MUSIC", type: "slider" },
    { key: "quality", label: "GRAPHICS", type: "cycle", values: ["auto", "high", "low"] },
    { key: "crt", label: "CRT EFFECT", type: "toggle" },
    { key: "flicker", label: "SCREEN FLICKER", type: "toggle" },
    { key: "cursor", label: "CUSTOM CURSOR", type: "toggle" },
    { key: "camera", label: "CAMERA MOVEMENT", type: "toggle" },
    { key: "shake", label: "SCREEN SHAKE", type: "toggle" },
    { key: "textSpeed", label: "TEXT SPEED", type: "cycle", values: ["slow", "normal", "fast", "instant"] },
    { key: "timer", label: "DECISION TIMER", type: "toggle" }
];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function buildOptionsPanel(container) {
    container.replaceChildren();
    const refreshers = [];

    for (const row of ROWS) {
        const wrap = el("div", "opt-row");
        wrap.appendChild(el("span", "opt-label", row.label));

        if (row.type === "slider") {
            const input = el("input");
            input.type = "range";
            input.min = 0;
            input.max = 100;
            const value = el("span", "opt-value");
            let lastTick = 0;
            const paint = () => { input.value = settings[row.key]; value.textContent = `${settings[row.key]}%`; };
            input.addEventListener("input", () => {
                setSetting(row.key, Number(input.value));
                value.textContent = `${input.value}%`;
                const now = performance.now();
                if (row.key === "sfxVolume" && now - lastTick > 70) { lastTick = now; play("tick", Number(input.value)); }
            });
            refreshers.push(paint);
            paint();
            wrap.append(input, value);
        } else {
            const btn = el("button", "opt-toggle btn");
            btn.type = "button";
            btn.dataset.sfx = "none"; // plays its own click sound below
            const paint = () => {
                if (row.type === "toggle") {
                    btn.textContent = settings[row.key] ? "ON" : "OFF";
                    btn.setAttribute("aria-pressed", String(!!settings[row.key]));
                } else {
                    btn.textContent = String(settings[row.key]).toUpperCase();
                }
            };
            btn.addEventListener("click", () => {
                if (row.type === "toggle") {
                    const next = !settings[row.key];
                    setSetting(row.key, next);
                    play("toggle", next);
                } else {
                    const i = row.values.indexOf(settings[row.key]);
                    setSetting(row.key, row.values[(i + 1) % row.values.length]);
                    play("toggle", true);
                }
                paint();
            });
            refreshers.push(paint);
            paint();
            wrap.appendChild(btn);
        }
        container.appendChild(wrap);
    }

    const reset = el("button", "opt-toggle opt-reset btn", "RESET DEFAULTS");
    reset.type = "button";
    reset.dataset.sfx = "none";
    reset.addEventListener("click", () => {
        resetSettings();
        refreshers.forEach(fn => fn());
        play("gear");
    });
    container.appendChild(reset);
}