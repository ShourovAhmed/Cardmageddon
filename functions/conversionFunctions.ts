import { Card, CardS, Set } from "../types";

export const splitMana = (mana: string) => {
    let splitted = mana.split(/[{}]/g).filter(item => item !== ''); // doet de '{' en '}' symbolen weg en filtert dan ook de lege plekken uit de array
    //TODO ook de half mana symbolen toevoegen bv B/R
    
    return splitted;
}

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


export const setToCardSs = (set : Set, baseCards? : CardS[]):CardS[] => { 

    let cards : CardS[] = [];
    if(baseCards){
        cards = [...baseCards];
    }

    for (let card of set.data){
        cards.push(cardToCardS(card));
        }
        return cards;
    }