import { Deck, CardS, Set, Card, CardFace } from "./types";
import { db } from "./index";
import { log } from "console";
const CryptoJS = require('crypto-js');
export const fullHash = (text: string):string => {
    let hashed = CryptoJS.PBKDF2(text, "9", {
        iterations: 1
      }).toString();
          return hashed;
}
export const emailHash = (email: string):string => {
    let split : string[] = email.toLocaleLowerCase().split('@');
    return split[0].substring(0,1) + fullHash(split[0].substring(1)) + "@" + split[1];
}

export const getFreeId = async() => {
    let i : number = 0;
    while (true){
        let test : Deck|null = await db.collection("decks").findOne<Deck>({id: i});
        if(test === null){
           return i;
        }
        i++;
    }
}

//DB MODE FUNCTIONS

export const cardToCardS = (card : Card): CardS => {

    
    let isLand : boolean = false;
    let isDblSided : boolean = false;
    if(card.type_line.split("//")[0].includes("Land")){
        isLand = true;
    }

    if(card.card_faces){
        if(!card.card_faces[0].image_uris){
            return{
                id: card.oracle_id,
                variations: [{id: card.id, count: 1}],
                mana: card.color_identity,
                manacost: card.cmc,
                isLand: isLand,
            }
        }
        else{
            isDblSided = true;
        }
    }

    return{
        id: card.oracle_id,
        variations: [{id: card.id, count: 1}],
        mana: card.color_identity,
        manacost: card.cmc,
        isLand: isLand,
        isDblSided: isDblSided
    }
};

export const getSet = (uri:string):Promise<Set> => {
    return fetch(uri).then((e) => e.json());
};
export const getCard = (cardId:string):Promise<Card> => {
    return fetch(`https://api.scryfall.com/cards/${cardId}`).then((e) => e.json());
};

export const setToCardSs = (set : Set, baseCards? : CardS[]):CardS[] => {

    let cards : CardS[] = [];
    if(baseCards){
        cards = [...baseCards];
    }

    for (let card of set.data){
        console.log("test1");
        console.table(cardToCardS(card));
        cards.push(cardToCardS(card));
        console.log("test2");
        
        }
        return cards;
    }




export const cardSsToDeck = (id : number, name : string, cards : CardS[], coverCard? : string): Deck => {
    if(!coverCard){
        coverCard = cards[0].variations[0].id;
    }

    let newDeck : Deck = {id: id, name: name, coverCard: coverCard, cards: []};

    let oracleIds : string[] = [];

    if(newDeck.cards){ //Omdat het moet -.-' ... anders zecht de rest van de code dat newDeck.cards undefined kan zijn. Wat niet zo is, het staat hierboven als let newDeck .... cards: [], toch?
        for (let card of cards){

            let isIncluded : boolean = false;
    
            if(oracleIds.includes(card.id)){
                let oracleIndex : number = oracleIds.indexOf(card.id);
    
                for(let variation of newDeck.cards[oracleIndex].variations){
                    if(variation.id === card.id){
                        variation.count ++;
                        isIncluded = true;
                        break;
                    }
                }
                if(!isIncluded){
                    newDeck.cards[oracleIndex].variations.push(card.variations[0]);
                }
                
            }
            else{
                newDeck.cards.push(card);
                oracleIds.push(card.id);
            }
        }

    }

    return newDeck;
}