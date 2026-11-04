import cards from "./cards.json" with {type: "json"};

const textBox = document.getElementById('text-box');
const acceptBtn = document.getElementById('accept');
const denyBtn = document.getElementById('deny');

let tasks = 1;
const taskLimit = 5

const Pillars = {
    Governo: 100,
    Investidores: 100,
    Clientes: 100,
    Concorrência: 40
};

function PickCard() {
    let id = Math.round((Math.random() * Object.keys(cards).length - 1) + 1).toString().padStart(3, 0);
    let selectedCard = cards[`card_${id}`]; 
    return selectedCard;
}

let pickedCard = PickCard()

textBox.innerText = pickedCard.text;
acceptBtn.innerText = pickedCard.options.A.text;
denyBtn.innerText = pickedCard.options.B.text;
