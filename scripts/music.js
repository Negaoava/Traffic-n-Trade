import { settings, onSettingChange } from "./settings.js";

const MASTER = 0.9;

// gain = loudness balance between songs (measured), by = original composer, arr = remix/arrangement author (null = none shown)
export const TRACKS = {
    menu: {
        file: "Mega Man 8 Stage Select.mp3", gain: 0.44,
        title: "Stage Select", game: "Mega Man 8", by: "Capcom", arr: null
    },
    lobby: {
        file: "Phoenix Wright Ace Attorney OST - Courtroom Lobby ~ Beginning Overture.mp3", gain: 0.38,
        title: "Courtroom Lobby ~ Beginning Overture", game: "Phoenix Wright: Ace Attorney", by: "Masakazu Sugimori / Capcom", arr: null
    },
    docks: {
        file: "Dire, Dire Docks (8-BIT REMIX) - Super Mario 64.mp3", gain: 1.55,
        title: "Dire, Dire Docks (8-bit remix)", game: "Super Mario 64", by: "Koji Kondo / Nintendo", arr: null
    },
    aquatic: {
        file: "Aquatic Ambiance 8 Bit Remix - Donkey Kong Country.mp3", gain: 0.41,
        title: "Aquatic Ambience (8-bit remix)", game: "Donkey Kong Country", by: "David Wise / Rare", arr: null
    },
    mirror: {
        file: "[Official] Celeste B-Sides - 05 - 2 Mello - Mirror Temple (Mirror Magic Mix).mp3", gain: 0.31,
        title: "Mirror Temple (Mirror Magic Mix)", game: "Celeste B-Sides", by: "Lena Raine", arr: "2 Mello"
    },
    sonic: {
        file: "Sonic 2 Aquatic Ruin Zone Jazz Arrangement insaneintherainmusic.mp3", gain: 0.41,
        title: "Aquatic Ruin Zone (jazz arrangement)", game: "Sonic the Hedgehog 2", by: "Masato Nakamura / SEGA", arr: "insaneintherainmusic"
    },
    brinstar: {
        file: "Super Metroid Music - Brinstar (The Jungle Floor).mp3", gain: 0.81,
        title: "Brinstar (The Jungle Floor)", game: "Super Metroid", by: "Kenji Yamamoto & Minako Hamano / Nintendo", arr: null
    },
    questioning: {
        file: "Phoenix Wright Ace Attorney OST - Questioning ~ Allegro 2001.mp3", gain: 0.31,
        title: "Questioning ~ Allegro 2001", game: "Phoenix Wright: Ace Attorney", by: "Masakazu Sugimori / Capcom", arr: null
    }
};

// day theme (WEEK[i].theme in rules.js) -> track
export const DAY_MUSIC = {
    morning: "lobby",
    office: "docks",
    rain: "aquatic",
    halloween: "mirror",
    blackfriday: "sonic",
    midnight: "brinstar",
    finale: "questioning"
};

export function musicForTheme(theme) { return DAY_MUSIC[theme] || null; }

const curve = () => Math.pow(settings.musicVolume / 100, 2) * MASTER; // perceptual volume curve

let ctx = null, bus = null;
let current = null;   // { id, audio, gain, node, level }
let wanted = null;    // id that should be playing
let fadeSecs = 1.2;

function getCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = curve();
    bus.connect(ctx.destination);
    return ctx;
}

function ramp(param, to, secs) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + Math.max(secs, 0.01));
}

function open(id) {
    const info = TRACKS[id];
    const audio = new Audio(new URL(`../songs/${encodeURIComponent(info.file)}`, import.meta.url));
    audio.loop = true;
    audio.preload = "auto";
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const node = ctx.createMediaElementSource(audio);
    node.connect(gain);
    gain.connect(bus);
    return { id, audio, gain, node, level: info.gain };
}

// fades a track out, then frees it (keeps at most 2 audio elements alive: good for phones)
function retire(track, secs) {
    ramp(track.gain.gain, 0.0001, secs);
    setTimeout(() => {
        track.audio.pause();
        track.audio.removeAttribute("src");
        track.audio.load();
        track.node.disconnect();
        track.gain.disconnect();
    }, secs * 1000 + 80);
}

// makes "what is playing" match "what is wanted"
function sync() {
    const id = curve() > 0 ? wanted : null;
    if ((current ? current.id : null) === id) return;

    if (!id) {
        if (current) { retire(current, fadeSecs); current = null; }
        return;
    }
    if (!getCtx()) return;
    if (current) retire(current, fadeSecs);

    const track = open(id);
    current = track;
    track.audio.play()
        .then(() => { if (current === track) ramp(track.gain.gain, track.level, fadeSecs); })
        .catch(() => {
            // blocked until the player interacts: forget it, the next click/tap tries again
            if (current === track) current = null;
            retire(track, 0.01);
        });
}

export function playMusic(id, fade = 1.2) {
    if (!TRACKS[id]) return;
    wanted = id;
    fadeSecs = fade;
    sync();
}

export function stopMusic(fade = 0.8) {
    wanted = null;
    fadeSecs = fade;
    sync();
}

// MUSIC slider (and "reset defaults")
onSettingChange((key) => {
    if (key !== "musicVolume" && key !== "*") return;
    if (bus) bus.gain.setTargetAtTime(curve(), ctx.currentTime, 0.03);
    sync();
});

// first interaction unlocks audio (touchend/click are the ones iOS accepts)
function unlock() {
    if (!getCtx()) return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    sync();
}
for (const ev of ["pointerup", "click", "touchend", "keydown"]) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
}

// pause when the tab/app goes to the background
document.addEventListener("visibilitychange", () => {
    if (!current) return;
    if (document.hidden) current.audio.pause();
    else current.audio.play().catch(() => {});
});