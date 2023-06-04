import { Deck, Info, CardS,  } from "../types";
import { db, maxNonLandCardcount, maxTotalCardsInDeck } from "../staticValues";

import { getCard } from "./scryfallFunctions";
import { getDeck } from "./mongoFunctions";
import { cookieInfo } from "..";
import { table } from "console";
import { deckAccess } from "./coreFunctions";




export const getFreeId = async() => {
    // IDs 0 to 9 are reserved! 
    let i : number = 10;
    while (true){
        let test : Deck|null = await db.collection("decks").findOne<Deck>({id: i});
        if(test === null){
           return i;
        }
        i++;
    }
}
export const removeCard = async(cardId : string, varId : string, deck : Deck, amount : number):Promise<Info> => {
    let i : number = 0;
    for(let card of deck.cards){
        if(card.id === cardId){
            let j : number = 0;
            for(let variation of card.variations){
                if(variation.id === varId){

                    deck.cards[i].variations[j].count = deck.cards[i].variations[j].count + amount;

                    if(deck.cards[i].variations[j].count < 0){
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

export const addCard = async(theCard : CardS, deck : Deck, amount : number):Promise<Info> => {
    if(theCard.isLand != true && amount > maxNonLandCardcount){
        return new Info(false, `Je kan enkel van land kaarten meer dan ${maxNonLandCardcount} in een deck hebben.`);
    }
    let cardInDeck : number = 0;
    let cardVarionsTotal : number;
    let getAllInfo : boolean;
    let cardIndex : number = -1;
    let variationIndex : number = -1;
    let i : number = 0;
    let j : number = 0;
    for(let card of deck.cards){
        getAllInfo = false;
        cardVarionsTotal = 0;
        j = 0;
        if(card.id === theCard.id){
            cardIndex = i;
            getAllInfo = true;
        }
        for(let variation of card.variations){
            
            cardVarionsTotal += variation.count;
            if(variation.id === theCard.variations[0].id){
                variationIndex = j;
            }
            j++;
        }
        cardInDeck += cardVarionsTotal;
        // NIET MEER DAN 60 KAARTEN PER DECK
        if(cardInDeck+amount > maxTotalCardsInDeck){
            return new Info(false, `Je kan niet meer dan ${maxTotalCardsInDeck} kaarten in een deck hebben.`)
        }
        // NIET MEER DAN 4 VAN EEN NIET LAND KAART
        if(getAllInfo && !card.isLand && cardVarionsTotal+amount > maxNonLandCardcount){
            return new Info(false, `Je kan enkel van land kaarten meer dan ${maxNonLandCardcount} in een deck hebben.`);
        }

        i++;
    }
    //NIEUWE KAART
    if(cardIndex === -1){
        theCard.variations[0].count = amount;
        deck.cards.push(theCard);
        await db.collection("decks").replaceOne({id: deck.id}, deck);
        return new Info(true, "Kaart toegevoegd");
    }
    // NIEUWE VARIATIE
    if(variationIndex === -1){
        deck.cards[cardIndex].variations.push({id: theCard.variations[0].id, count: amount});
        await db.collection("decks").replaceOne({id: deck.id}, deck);
        return new Info(true, "Variatie toegevoegd");
    }
    //AANTAL VAN VARIATIE VERHOGEN
    let newCount : number = deck.cards[cardIndex].variations[variationIndex].count + amount
    deck.cards[cardIndex].variations[variationIndex].count = newCount;
    await db.collection("decks").replaceOne({id: deck.id}, deck);
    return new Info(true, `Aantal verhoogd naar ${newCount}`);
};

export const addOrRemoveCard = async(deckId : number, cardId : string, amount : number):Promise<Info> => {

        if(await deckAccess(deckId) <2){
            return new Info(false, "U hebt niet voldoende recht op dit deck.")
        }

        //check the input
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
}

//Returns a new deck given a name,
//option to directly add cards as cardSArr or deckId as a number
export const makeNewDeck = async (name : string, userId : number, cards? : CardS[], deckId? : number): Promise<Deck> => {

    if(!deckId && deckId != 0){
        deckId = await getFreeId();
    }

    let newDeck : Deck = {id: deckId, name: name, coverCard: null, cards: []};
    await db.collection("users").updateOne({id: userId},{$push: {decks: newDeck.id}});

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

//Copy Deck
export const copyDeck = async(deckId : number, name : string):Promise<Info> => {
    let info : Info = new Info;
    let deck : Deck = await getDeck(deckId);

    try{
        deck._id = undefined;
        deck.id = await getFreeId();
        deck.name = name;
        await db.collection("decks").insertOne(deck);
        await db.collection("users").updateOne({id: cookieInfo.id},{$push: {decks: deck.id}});
    }
    catch (e){
        info.message = "Kopieren mislukt";
        return info;
    }
    info.succes = true;
    info.message = `Deck gekopieerd als: ${deck.name}`;
    info.direct = deck.id;
    return info; 
}