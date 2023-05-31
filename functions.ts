import { Deck, CardS, Set, Card, CardFace, Info } from "./types";
import { db } from "./index";
import { error, log } from "console";
import { promises } from "dns";
import { maxNonLandCardcount, maxTotalCardsInDeck } from "./staticValues";
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

//Returns a new deck given a name,
//option to directly add cards as cardSArr or deckId as a number
export const newDeck = async (name : string, cards? : CardS[], deckId? : number, ): Promise<Deck> => {
    if(!deckId){
        deckId = await getFreeId();
    }
    let newDeck : Deck = {id: deckId, name: name, coverCard: null, cards: []};

    if(!cards){
        return newDeck;
    }

    let oracleIds : string[] = [];
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
    return newDeck;
}

// MONGO CALLS

// returns a deck from Mongo when given a correct deck ID 
export const getDeck =  async(deckId: number) => {
    let deck : Deck|null = await db.collection("decks").findOne<Deck>({id: deckId});
    if(deck === null){
        throw new Info(false, `Deck met ID ${deckId} niet gevonden in je DB`);
    }
    return deck;
}

//returns the cardVarIds out of a given deck
export const getDeckImages = (deck : Deck):string[] =>{
    if(deck.cards.length === 0){
        throw new Info(false, "Geen kaarten gevonden in dit deck")
    }
    let deckImages : string[] = [];
    for(let card of deck.cards){
        for(let variation of card.variations){
            deckImages.push(variation.id);
        }
    }
    return deckImages;
}

export const addNewVariation = (deck : Deck, cardIndex : number, variationId : string):Deck => {
    deck.cards[cardIndex].variations.push({id: variationId, count: 1});
    return deck;
};

export const removeCard = async(cardId : string, varId : string, deck : Deck, amount : number):Promise<Info> => {
    let i : number = 0;
    for(let card of deck.cards){
        if(card.id === cardId){
            let j : number = 0;
            for(let variation of card.variations){
                if(variation.id === varId){
                    deck.cards[i].variations[j].count = deck.cards[i].variations[j].count + amount;
                    console.log(deck.cards[i].variations[j].count)
                    if(deck.cards[i].variations[j].count < 0){
                        console.log(deck.cards[i].variations.length);
                        
                        if(deck.cards[i].variations.length === 1){
                            deck.cards.splice(i,1);
                            await db.collection("decks").replaceOne({id: deck.id}, deck);
                            return new Info(true, "Kaart verwijderd");
                        }
                        deck.cards[i].variations.splice(j,1);
                        await db.collection("decks").replaceOne({id: deck.id}, deck);
                        return new Info(true, "Variatie verwijderd");
                    }
                    await db.collection("decks").replaceOne({id: deck.id}, deck);
                    return new Info(true, `Hoeveelheid verminderd naar ${variation.count}`);
                }
            j++;
            }
        }
        i++;
    }
    return new Info(false, `Kaart met ID: ${varId}\nNiet gevonden in deck met ID: ${deck.id}}`);
};

export const addCard = async(card : CardS, deck : Deck, amount : number):Promise<Info> => {

    return {succes: true, message: "Some info"};
};

export const addOrRemoveCard = async(deckId : number, cardId : string, amount : number):Promise<Info> => {

        //check the input
        console.log(amount);
        if(amount === 0){            
            return new Info(false, "De gegeven hoeveelheid kan niet nul zijn");
        }

            let deck : Deck = await getDeck(deckId);
            let theCard : CardS = await getCard(cardId);
            if(amount < 0){
                return await removeCard(theCard.id, theCard.variations[0].id, deck, amount);
            }
            else{
                return await addCard(theCard, deck, amount);
            }

        // //initialyse variables
        // let deckCardCount : number = 0;
        // let cardIndex : number = -1;
        // let variationIndex : number = -1;
        // let updateCardTotalVariationCount = 0;
        // let startVariationCount : boolean;

        // for(let i : number = 0; i < deck.cards.length; i++){ 
        //     startVariationCount = false;
        //     if(deck.cards[i].id === theCard.id){
        //         cardIndex = i; //record place to possibly put the card
        //         if(!deck.cards[i].isLand){
        //             startVariationCount = true;
        //         }
        //     }
        //     for(let j : number = 0; j < deck.cards[i].variations.length; j++){
        //         if(startVariationCount){
        //             updateCardTotalVariationCount += deck.cards[i].variations[j].count;
        //         }
        //         if(deck.cards[i].variations[j].id === theCard.variations[0].id){
        //             variationIndex = j; //record place to possibly put the variation
        //         }
        //         deckCardCount += deck.cards[i].variations[j].count;
        //         if(deckCardCount > maxTotalCardsInDeck + amount){ 
        //              new Info(false, "Je kan niet meer dan 60 kaarten in een deck hebben");
        //         }
        //     }
        //     if(amount < 0 && variationIndex != -1){
        //         let newCount : number = deck.cards[cardIndex].variations[variationIndex].count + amount; 
        //         console.log(newCount);
                 
        //         if(newCount < 0){
        //             deck.cards[cardIndex].variations.splice(variationIndex,1);
        //             if(deck.cards[cardIndex].variations.length === 0){
        //                 deck.cards.splice(cardIndex,1);
        //             }
        //         }
        //         deck.cards[cardIndex].variations[variationIndex].count = newCount;
        //         await db.collection("decks").replaceOne({id: deckId}, deck);


        //     }
        //     if(!deck.cards[i].isLand && (updateCardTotalVariationCount + amount) > maxNonLandCardcount){
        //         throw new Info(false, "Je kan niet meer dan 4 van deze kaart in een deck hebben");
        //     }
        // }




}