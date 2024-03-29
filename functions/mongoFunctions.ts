import { Deck, Info } from "../types";
import { db, testDeckIds } from "../staticValues";

import { myDeckIds } from "./coreFunctions";


// returns a deck from Mongo when given a correct deck ID 
export const getDeck =  async(deckId: number):Promise<Deck> => {
    let deck : Deck|null = await db.collection("decks").findOne<Deck>({id: deckId});
    if(deck === null){
        throw new Info(false, `Deck met ID ${deckId} niet gevonden in je DB`);
    }
    return deck;
}

export const getDecks = async():Promise<Deck[]> => {

    let availableDecks : number[] = [...testDeckIds, ...await myDeckIds()];
    return await db.collection('decks').find<Deck>({id: { $in: availableDecks}}).toArray();

};