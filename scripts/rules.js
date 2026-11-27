export const DAYS_IN_WEEK = 7;
export const FOLLOWUP_CHANCE = 0.5;               // chance a "consequence" card shows up when one is ready
export const TIMEOUT_PENALTY = { Investidores: -2 }; // applied when the decision timer runs out
const KEYS = ["investors", "clients", "government", "competition"];

/* ---------------- The week ----------------
   scale      -> multiplies every effect that day (the game gets swingier)
   volatility -> each effect is randomly +-% off, so outcomes get less predictable
   ambiguity  -> extra weight for "no clear right answer" cards
   timer      -> seconds to decide (null = no timer)
   boost      -> category weights (cards from these categories show up more)  */
export const WEEK = [
  { name: "Segunda-feira", tag: "Manhã cedo", theme: "morning", clock: [7, 10], scale: 0.8, volatility: 0, ambiguity: 0, timer: null, boost: {},
    intro: "Primeiro dia no cargo. A cidade ainda está acordando." },
  { name: "Terça-feira", tag: "Expediente normal", theme: "office", clock: [14, 25], scale: 1, volatility: 0.05, ambiguity: 0, timer: null, boost: {},
    intro: "A rotina começa a pesar. Cada decisão deixa rastros." },
  { name: "Quarta-feira", tag: "Dia de tempestade", theme: "rain", clock: [16, 40], scale: 1, volatility: 0.1, ambiguity: 0.3, timer: null,
    boost: { operations: 2, supply_chain: 2, environment: 2 },
    intro: "A chuva alagou metade da cidade. As entregas viraram um pesadelo." },
  { name: "Quinta-feira", tag: "Noite das Bruxas", theme: "halloween", clock: [19, 30], scale: 1.2, volatility: 0.2, ambiguity: 0.6, timer: null, boost: {},
    intro: "A equipe veio fantasiada. Algumas propostas de hoje parecem... assombradas." },
  { name: "Sexta-feira", tag: "Black Friday", theme: "blackfriday", clock: [11, 50], scale: 1.4, volatility: 0.3, ambiguity: 1, timer: 35,
    boost: { marketing: 2, clients: 2, technology: 2, competition: 2 },
    intro: "Pedidos em dobro e servidores no limite. A partir de hoje, o tempo para decidir está contando." },
  { name: "Sábado", tag: "Plantão da madrugada", theme: "midnight", clock: [0, 10], scale: 1.55, volatility: 0.4, ambiguity: 1.5, timer: 25,
    boost: { legal: 2, security: 2, governance: 2, regulation: 2 },
    intro: "Meia-noite no escritório. Só as luzes de emergência e más notícias." },
  { name: "Domingo", tag: "A última audiência", theme: "finale", clock: [6, 0], scale: 1.7, volatility: 0.45, ambiguity: 2, timer: 18, boost: { governance: 2, government: 2, investors: 2 },
    intro: "O amanhecer do último dia. Tudo o que você fez volta para cobrar a conta." }
];

/* ---------------- Endings ---------------- */
export const SHADY_FLAGS = ["data_breach_hidden", "corruption_unresolved", "contract_fraud_unresolved", "salary_delay", "financial_inconsistency",
    "selective_disclosure", "information_exposure", "data_monetization", "regulatory_delay", "audit_dispute", "productivity_pressure", "maintenance_deferred",
    "reactive_maintenance", "waste_responsibility_dispute", "environmental_complaints", "protest_confrontation", "informal_waiting", "unanswered_rumors",
    "unrealistic_deadlines", "pricing_dispute", "billing_complaints", "warehouse_overload", "creative_accounting", "press_war", "hush_deal", "obstruction",
    "blame_driver", "strike_breaking", "overtime_pressure"];

export const CLEAN_FLAGS = ["data_breach_response", "anti_corruption_investigation", "contract_investigation", "payroll_protected", "financial_audit",
    "public_transparency", "audit_cooperation", "environmental_compliance", "community_dialogue", "employee_council", "balanced_worker_metrics",
    "pricing_transparency", "privacy_protected", "waste_audit", "preventive_maintenance", "app_accessibility", "public_fact_check", "community_support",
    "delivery_pay_reform", "internal_security_review", "data_breach_admitted", "noise_control", "security_overhaul", "fleet_audit", "cooperated_probe", "opt_out_program"];

export const ENDINGS = {
    exemplary: { title: "Gestor Exemplar", text: "Você atravessou a semana sem trair seus princípios e manteve todos os pilares de pé. A diretoria já fala em promoção." },
    tightrope: { title: "Equilibrista", text: "Nenhum pilar caiu. Você andou na corda bamba por sete dias e chegou ao outro lado, ainda de pé." },
    fox: { title: "Raposa dos Negócios", text: "Os investidores adoram você. Só não perguntam de onde veio o lucro, e você agradece o silêncio deles." },
    scandal: { title: "Escândalo Anunciado", text: "Você sobreviveu à semana, mas deixou rastros demais. Os jornais já preparam as manchetes de segunda." },
    beloved: { title: "Queridinho do Povo", text: "Os clientes te amam. Os investidores estão menos animados, mas não dá para ter tudo." },
    shark: { title: "Tubarão do Mercado", text: "O dinheiro fala, e fala alto. Clientes e fiscais nem tanto, mas o balanço brilha." },
    bureaucrat: { title: "Sócio do Estado", text: "A empresa agora é a queridinha da prefeitura, para o bem e para o mal. Papelada nunca mais vai faltar." },
    besieged: { title: "Cerco da Concorrência", text: "Você sobreviveu, mas os rivais estão em cima. A próxima semana promete ser ainda mais difícil." },
    survivor: { title: "Sobrevivente", text: "Machucado, cansado, mas empregado. Em uma semana como essa, já é uma vitória." }
};

export function evaluateEnding(p, flagsEver) {
    const shady = SHADY_FLAGS.filter(f => flagsEver.has(f)).length;
    const clean = CLEAN_FLAGS.filter(f => flagsEver.has(f)).length;
    const balanced = [p.government, p.investors, p.clients].every(v => v >= 30 && v <= 70) && p.competition <= 55;
    let ending = ENDINGS.survivor;
    if (shady >= 14 && p.investors >= 60) ending = ENDINGS.fox;
    else if (shady >= 14 && p.government <= 45) ending = ENDINGS.scandal;
    else if (clean >= 12 && shady <= 8 && balanced) ending = ENDINGS.exemplary;
    else if (balanced) ending = ENDINGS.tightrope;
    else if (p.clients >= 70) ending = ENDINGS.beloved;
    else if (p.investors >= 70) ending = ENDINGS.shark;
    else if (p.government >= 70) ending = ENDINGS.bureaucrat;
    else if (p.competition >= 65) ending = ENDINGS.besieged;
    return { ...ending, shady, clean };
}

/* ---------------- Card selection ----------------
   ctx = { day, choiceNumber, totalChoices, flags:Set, flagTurn:{}, used:Set, lastCategory,
           pillars:{ government, investors, clients, competition } }

   Card fields understood here (all optional):
     requirements: { day, minDay, maxDay, flags:[all], anyFlags:[one+], notFlags:[none],
                     delay:N (flag must have been set N choices ago), pillars:{ clients:{min,max} } }
     schedule:     { day, at }   -> forced at that exact choice of that day (highest "priority" wins)
     weight:       number        -> draw weight (default 1)                                   */
export function hasFlagReq(req) {
    return !!(req && ((req.flags && req.flags.length) || (req.anyFlags && req.anyFlags.length)));
}

export function meetsRequirements(req, ctx) {
    if (!req) return true;
    if (req.day != null && ctx.day !== req.day) return false;
    if (req.minDay != null && ctx.day < req.minDay) return false;
    if (req.maxDay != null && ctx.day > req.maxDay) return false;
    const delay = req.delay || 0;
    const ready = f => ctx.flags.has(f) && ctx.totalChoices - (ctx.flagTurn[f] ?? ctx.totalChoices) >= delay;
    if (req.flags && !req.flags.every(ready)) return false;
    if (req.anyFlags && !req.anyFlags.some(ready)) return false;
    if (req.notFlags && req.notFlags.some(f => ctx.flags.has(f))) return false;
    if (req.pillars) {
        for (const key in req.pillars) {
            const range = req.pillars[key], value = ctx.pillars[key];
            if (range.min != null && value < range.min) return false;
            if (range.max != null && value > range.max) return false;
        }
    }
    return true;
}

// "No clear right answer": both options are worth about the same, or one of them hides a risk
const ambiguityCache = new WeakMap();
export function isAmbiguous(card) {
    if (!ambiguityCache.has(card)) {
        const score = o => {
            const e = card.options[o].effects || {};
            return (e.investors || 0) + (e.clients || 0) + (e.government || 0) - (e.competition || 0);
        };
        const risky = !!(card.options.A.risk || card.options.B.risk);
        ambiguityCache.set(card, risky || Math.abs(score("A") - score("B")) <= 3);
    }
    return ambiguityCache.get(card);
}

function cardWeight(card, ctx, dayCfg) {
    let w = card.weight ?? 1;
    w *= (dayCfg.boost && dayCfg.boost[card.category]) || 1;
    if (card.category === ctx.lastCategory) w *= 0.25;
    if (isAmbiguous(card)) w *= 1 + (dayCfg.ambiguity || 0);
    return Math.max(w, 0.01);
}

function weighted(list, ctx, dayCfg, rng) {
    const weights = list.map(([, card]) => cardWeight(card, ctx, dayCfg));
    let roll = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return { id: list[i][0], card: list[i][1] };
    }
    const last = list[list.length - 1];
    return { id: last[0], card: last[1] };
}

function tryDraw(all, ctx, rng) {
    const dayCfg = WEEK[Math.min(ctx.day, WEEK.length) - 1];
    const eligible = Object.entries(all).filter(([id, card]) => !ctx.used.has(id) && meetsRequirements(card.requirements, ctx));

    const slot = eligible.filter(([, c]) => c.schedule && c.schedule.day === ctx.day && c.schedule.at === ctx.choiceNumber);
    if (slot.length) {
        slot.sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0));
        return { id: slot[0][0], card: slot[0][1] };
    }

    const open = eligible.filter(([, c]) => !c.schedule);
    const followUps = open.filter(([, c]) => hasFlagReq(c.requirements));
    if (followUps.length && rng() < FOLLOWUP_CHANCE) return weighted(followUps, ctx, dayCfg, rng);

    const normal = open.filter(([, c]) => !hasFlagReq(c.requirements));
    if (normal.length) return weighted(normal, ctx, dayCfg, rng);
    return followUps.length ? weighted(followUps, ctx, dayCfg, rng) : null;
}

// Draws the next card. Mutates ctx.used (the caller keeps that Set for the whole run).
export function drawCard(all, ctx, rng = Math.random) {
    let result = tryDraw(all, ctx, rng);
    if (!result) { // deck exhausted: shuffle the ordinary cards back in
        for (const id of [...ctx.used]) {
            const c = all[id], req = c.requirements || {};
            if (!c.schedule && !hasFlagReq(req) && req.day == null) ctx.used.delete(id);
        }
        result = tryDraw(all, ctx, rng);
    }
    if (result) ctx.used.add(result.id);
    return result;
}

/* ---------------- Effects ---------------- */
export function rollEffects(effects, dayCfg, rng = Math.random) {
    const out = {};
    for (const key of KEYS) {
        const base = (effects && effects[key]) || 0;
        if (!base) { out[key] = 0; continue; }
        const noise = 1 + (rng() * 2 - 1) * (dayCfg.volatility || 0);
        let value = Math.round(base * (dayCfg.scale || 1) * noise);
        if (value === 0) value = Math.sign(base);
        out[key] = value;
    }
    return out;
}