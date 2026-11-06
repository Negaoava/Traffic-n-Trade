import cards from "./cards.json" with {type: "json"};

const textBox = document.getElementById('text-box');
const acceptBtn = document.getElementById('accept');
const denyBtn = document.getElementById('deny');
const taskLimit = 5
let currentTask = 1;


const Pillars = {
    Governo: 50,
    Investidores: 50,
    Clientes: 50,
    Concorrência: 40
};
console.log(Pillars);

function PickCard() {
    let id = (Math.floor(Math.random() * Object.keys(cards).length) + 1).toString().padStart(3, "0");
    let selectedCard = cards[`card_${id}`]; 
    return selectedCard;
}
let pickedCard = PickCard();

displayCard(pickedCard);

acceptBtn.addEventListener('click', () => {
    changePillars(pickedCard, 'A');
    pickedCard = PickCard();
    displayCard(pickedCard);
    console.log(Pillars);
});


denyBtn.addEventListener('click', () => {
    changePillars(pickedCard, 'B');
    pickedCard = PickCard();
    displayCard(pickedCard);
    console.log(Pillars);
}); 

function displayCard(card) {
    textBox.innerText = card.text;
    acceptBtn.innerText = card.options.A.text;
    denyBtn.innerText = card.options.B.text;
}

function changePillars(card, choice) {
    if (choice === 'A') {
        Pillars.Clientes += card.options.A.effects.clients;
        Pillars.Concorrência += card.options.A.effects.competition;
        Pillars.Governo += card.options.A.effects.government;
        Pillars.Investidores += card.options.A.effects.investors;
    }
    else {
        Pillars.Clientes += card.options.B.effects.clients;
        Pillars.Concorrência += card.options.B.effects.competition;
        Pillars.Governo += card.options.B.effects.government;
        Pillars.Investidores += card.options.B.effects.investors;
    }
}