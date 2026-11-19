/* Custom cursor (with shadow) and mouse-driven camera. */
import { settings, onSettingChange, hasFinePointer } from "./settings.js";

/* ---------------- Cursor ---------------- */
const OUT = "#0d140d", GREEN = "#a3cfa4";
const svg = (body) => `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'>${body}</svg>`)}")`;

// hx/hy = the "hot spot" (the pixel that actually clicks), in a 32px box
const SPRITES = {
    arrow: { hx: 2, hy: 2, img: svg(`<polygon points='1,1 1,13 4,10 6,15 8,14 6,9 10,9' fill='${GREEN}' stroke='${OUT}' stroke-width='1.2'/>`) },
    hand: { hx: 13, hy: 2, img: svg(`<path d='M5 1H8V6H10V7H12V8H14V13L12 15H7L3 11L4 10L5 11Z' fill='${GREEN}' stroke='${OUT}' stroke-width='1.2'/>`) },
    pen: { hx: 2, hy: 30, img: svg(
        `<polygon points='1,15 3,10 6,13' fill='#c96a6a' stroke='${OUT}'/>` +
        `<polygon points='3,10 11,2 14,5 6,13' fill='#60666a' stroke='${OUT}'/>` +
        `<polygon points='11,2 12.5,0.5 15.5,3.5 14,5' fill='#8b3a3a' stroke='${OUT}'/>`) }
};

// which sprite for whatever is under the mouse
function spriteFor(el) {
    if (!el || !el.closest) return "arrow";
    if (el.closest(".paper.active")) return "pen";
    if (el.closest("button, a, input, .btn")) return "hand";
    return "arrow";
}

export function initCursor() {
    if (!hasFinePointer) return;
    const cursor = document.createElement("div");
    const shadow = document.createElement("div");
    cursor.className = "tt-cursor";
    shadow.className = "tt-cursor tt-cursor-shadow";
    document.body.append(shadow, cursor);

    const mouse = { x: -100, y: -100 }, sh = { x: -100, y: -100 };
    let state = "arrow", pressed = false, frame = 0;

    function setState(next) {
        if (next === state && cursor.style.backgroundImage) return;
        state = next;
        cursor.style.backgroundImage = shadow.style.backgroundImage = SPRITES[state].img;
    }
    setState("arrow");

    function show(on) {
        cursor.classList.toggle("visible", on);
        shadow.classList.toggle("visible", on);
    }

    window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        show(true);
    }, { passive: true });
    window.addEventListener("pointerdown", () => { pressed = true; });
    window.addEventListener("pointerup", () => { pressed = false; });
    document.documentElement.addEventListener("mouseleave", () => show(false));

    function loop() {
        const sp = SPRITES[state];
        // the shadow trails behind; when you press, the cursor "sinks" and the shadow closes in
        sh.x += (mouse.x + (pressed ? 2 : 6) - sh.x) * 0.25;
        sh.y += (mouse.y + (pressed ? 3 : 9) - sh.y) * 0.25;
        const scale = pressed ? 0.88 : 1;
        cursor.style.transform = `translate(${mouse.x - sp.hx}px, ${mouse.y - sp.hy}px) scale(${scale})`;
        shadow.style.transform = `translate(${sh.x - sp.hx}px, ${sh.y - sp.hy}px) scale(${scale})`;
        // polling (not just on move) so it also reacts when the paper appears under a still mouse
        if (++frame % 5 === 0) setState(spriteFor(document.elementFromPoint(mouse.x, mouse.y)));
        requestAnimationFrame(loop);
    }
    loop();
}

/* ---------------- Camera ----------------
   Sets --cam-x / --cam-y (px) on `root`; the CSS decides which layers use them.
   The camera follows the mouse like a spring, and punch()/shake() add impulses. */
export function initCamera({ root }) {
    let px = 0, py = 0, vx = 0, vy = 0, tx = 0, ty = 0;
    let running = false, last = 0, shakeAmp = 0, shakeStart = 0, shakeEnd = 0;
    const STIFFNESS = 140, DAMPING = 15;

    function kick() {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(step);
    }

    function step(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        vx += ((tx - px) * STIFFNESS - vx * DAMPING) * dt;
        vy += ((ty - py) * STIFFNESS - vy * DAMPING) * dt;
        px += vx * dt;
        py += vy * dt;
        const maxX = innerWidth * 0.03, maxY = innerHeight * 0.03; // stay inside the scene's overscan
        px = Math.max(-maxX, Math.min(maxX, px));
        py = Math.max(-maxY, Math.min(maxY, py));

        let sx = 0, sy = 0;
        if (now < shakeEnd) {
            const k = (shakeEnd - now) / (shakeEnd - shakeStart);
            sx = (Math.random() * 2 - 1) * shakeAmp * k;
            sy = (Math.random() * 2 - 1) * shakeAmp * k;
        }
        root.style.setProperty("--cam-x", `${(px + sx).toFixed(2)}px`);
        root.style.setProperty("--cam-y", `${(py + sy).toFixed(2)}px`);

        const settled = Math.abs(tx - px) < 0.05 && Math.abs(ty - py) < 0.05 && Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5 && now >= shakeEnd;
        if (settled) { running = false; return; }
        requestAnimationFrame(step);
    }

    window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || !settings.camera) return;
        tx = -((e.clientX / innerWidth) * 2 - 1) * innerWidth * 0.012;
        ty = -((e.clientY / innerHeight) * 2 - 1) * innerHeight * 0.012;
        kick();
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => { tx = ty = 0; kick(); });
    onSettingChange((key) => { if (key === "camera" || key === "*") { tx = ty = 0; kick(); } });

    return {
        punch(dx, dy) { // quick kick (px/s) that springs back, like hitting an arrow in FNF
            if (!settings.camera) return;
            vx += dx;
            vy += dy;
            kick();
        },
        shake(amp = 8, ms = 350) {
            if (!settings.shake) return;
            shakeAmp = amp;
            shakeStart = performance.now();
            shakeEnd = shakeStart + ms;
            kick();
        }
    };
}