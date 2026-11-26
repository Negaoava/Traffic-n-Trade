import { WEEK } from "./rules.js";
import { TRACKS, DAY_MUSIC } from "./music.js";

const TEAM = [
    ["PROGRAMMER", "Davi Silva de Lima"],
    ["DESIGNER", "Mayla Lima de Souza"]
];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function buildCredits(container) {
    container.replaceChildren();

    const team = el("div", "cr-team");
    for (const [role, name] of TEAM) {
        const block = el("div");
        block.append(el("p", "cr-role", role), el("p", "cr-name", name));
        team.appendChild(block);
    }
    container.appendChild(team);

    // where each song plays
    const plays = { menu: ["Main menu"] };
    WEEK.forEach((d, i) => {
        const id = DAY_MUSIC[d.theme];
        if (id) (plays[id] = plays[id] || []).push(`Day ${i + 1} (${d.tag})`);
    });

    container.appendChild(el("p", "cr-heading", "MUSIC"));
    for (const id of Object.keys(plays)) {
        const t = TRACKS[id];
        const card = el("div", "cr-track");
        card.appendChild(el("p", "cr-title", `> ${t.title}`));
        card.appendChild(el("p", "cr-line", t.game));
        card.appendChild(el("p", "cr-line", `Original: ${t.by}`));
        if (t.arr) card.appendChild(el("p", "cr-line", `Arrangement: ${t.arr}`));
        card.appendChild(el("p", "cr-plays", `Plays on: ${plays[id].join(" / ")}`));
        container.appendChild(card);
    }

    container.appendChild(el("p", "cr-note",
        "All music belongs to its respective composers and publishers. Used here only for this educational project."));
}