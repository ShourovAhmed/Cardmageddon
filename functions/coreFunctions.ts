import { Deck, CardS, Set, Card, CardFace, Info, CookieInfo, User } from "../types";

import { cookieInfo} from "../index";
import { db, client, CryptoJS, testDeckIds } from "../staticValues";

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

export const myDeckIds = async():Promise<number[]> => {
    let user : User|null = await db.collection("users").findOne<User>({id: cookieInfo.id});
    if(user != null){
        return user.decks
    }
    return [];
}

// Gives back access level of a given deck by deck ID
export const deckAccess = async(deckId : number):Promise<number> => {
// 0 = no access
// 1 = view only
// 2 = (open access slot) // atm: deckimg, rename, card-add/remove
// 3 = full access

    for(let id of await myDeckIds()){
        if(id === deckId){
            return 3;
        }
    }
    if(false){
        return 2;
    }
    if(await testDeckIds.includes(deckId)){
        return 1;
    }
    
    return 0;
}  