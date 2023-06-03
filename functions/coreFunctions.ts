import { Deck, CardS, Set, Card, CardFace, Info, CookieInfo, User } from "../types";

import { cookieInfo} from "../index";
import { db, client, CryptoJS } from "../staticValues";

import { getCard } from "./scryfallFunctions";
import { getFreeId } from "./deckFunctions";

import { error, log } from "console";


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

export const capitalizeFirstLetter = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
}


// MONGO CALLS

export const getOwnDeckIds = async(userId : number):Promise<number[]> => {
    let user : User|null = await db.collection("users").findOne<User>({id: cookieInfo.id});
    if(user != null){
        return user.decks
    }
    return [];
}



export const getMyDecks = () => { 
    
}

// Gives back access level of a given deck by deck ID
export const deckAccess = (deckId : number):number => {
// 0 = no access
// 1 = view only
// 2 = full access
    if(deckId >= 0 && deckId < 10){
        return 1;
    }
    // if(myDecks().includes(deckId)){
    //     return 2;
    // }

    return 0;

}