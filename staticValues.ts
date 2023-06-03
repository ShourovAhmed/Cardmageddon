import { cookieInfo } from ".";
import { MongoClient } from "mongodb";
//APP CONSTS
export const CryptoJS = require('crypto-js');
//MONGO
export const uri : string =
    "mongodb+srv://Pintjens:Dobby963@cardmageddon.jjjci9m.mongodb.net/?retryWrites=true&w=majority";
export const client = new MongoClient(uri);
export const db = client.db("userData");

export const maxNonLandCardcount : number = 4;
export const maxTotalCardsInDeck : number = 60;
export const testDeckIds : number[] = [0,1,2,3,4,5,6,7,8,9];
export const mssg : string = `Welcome my hacky friend. You found my secret doorway ^^ And you are now loged in as `;