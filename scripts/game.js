import cards from "./cards.json" with {type: "json"};

const textBox = document.getElementById('text-box');
const acceptBtn = document.getElementById('accept');
const denyBtn = document.getElementById('deny');
const taskLimit = 5
let tasks = 1;


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

textBox.innerText = pickedCard.text;
acceptBtn.innerText = pickedCard.options.A.text;
denyBtn.innerText = pickedCard.options.B.text;

acceptBtn.addEventListener('click', () => {
    Pillars.Clientes += pickedCard.options.A.effects.clients;
    Pillars.Concorrência += pickedCard.options.A.effects.competition;
    Pillars.Governo += pickedCard.options.A.effects.government;
    Pillars.Investidores += pickedCard.options.A.effects.investors;
    
    console.log(Pillars);
    pickedCard = PickCard();
  
    textBox.innerText = pickedCard.text;
    acceptBtn.innerText = pickedCard.options.A.text;
    denyBtn.innerText = pickedCard.options.B.text;
});


denyBtn.addEventListener('click', () => {
    Pillars.Clientes += pickedCard.options.B.effects.clients;
    Pillars.Concorrência += pickedCard.options.B.effects.competition;
    Pillars.Governo += pickedCard.options.B.effects.government;
    Pillars.Investidores += pickedCard.options.B.effects.investors;

    console.log(Pillars);
    pickedCard = PickCard();
    
    textBox.innerText = pickedCard.text;
    acceptBtn.innerText = pickedCard.options.A.text;
    denyBtn.innerText = pickedCard.options.B.text;
}); 