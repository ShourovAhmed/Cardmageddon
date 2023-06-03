import { CardS, Card, Info, Set } from "../types";

import { cardToCardS } from "./conversionFunctions";

export const getSet = async(uri:string):Promise<Set> => {
    try{ 
        return fetch(uri).then((e) => e.json());
    }
    catch{
        throw new Info(false, "set niet gevonden in skryfall");
    }

};
export const getCard = async(cardId:string):Promise<CardS> => {
        let card : Card|any = await fetch(`https://api.scryfall.com/cards/${cardId}`).then((e) => e.json());
        if(card.object != "card"){
            throw new Info(false, "kaart ID niet gevonden in skryfall");
        }
        return cardToCardS(card);
}; 