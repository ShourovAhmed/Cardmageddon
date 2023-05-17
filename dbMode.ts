import { MongoClient, ObjectId, Collection } from "mongodb";

const CryptoJS = require('crypto-js');
const readLine = require('readline-sync');

const uri: string =
    "mongodb+srv://admin:admin@cardmageddon.jjjci9m.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri);

const db = client.db("userData");

interface LoginData{
    _id?: ObjectId,
    id: number,
    user_id: number,
    username: string, // hashed?
    password: string  // hashed
}
interface User {
    _id?: ObjectId,
    id: number,
    firstName: string,
    surname: string,
    email?: string, //semi hashed
    decks?: number[] //deck_id array
}
interface Variation{
    id:     string, // scryfall ID
    count:  number
}
interface CardS {   // kleine samenvatting
    id:         string, // Oracle ID
    variations: Variation[],
    mana:       string[],
    manacost:   number,
    isLand:     boolean
}
interface Mana{
    white: number,
    blue: number,
    black: number,
    red: number,

}
interface Deck{
    _id?: ObjectId,
    id: number,
    name: string,
    cards?: CardS[],
    coverCard?: string, //cardID???
}

export interface ImageUris {
    small:       string;
    normal:      string;
    large:       string;
    png:         string;
    art_crop:    string;
    border_crop: string;
}
export interface Card {
    object:            string;
    id:                string;
    oracle_id:         string;
    multiverse_ids:    string[];
    name:              string;
    cmc:               number,
    image_uris:        ImageUris;
    color_identity:    string[];
    set_id:            string;
    set:               string;
    set_name:          string;
    set_type:          string;
    type_line:         string
}

export interface Set {
    object:      string;
    total_cards: number;
    has_more:    boolean;
    data:        Card[];
}

const hash = (password: string) => {
    let hashedPasword = CryptoJS.PBKDF2(password, "9", {
  iterations: 1
}).toString();
    return hashedPasword;
}

const coreUsers : User[] = [
    {id: 0, firstName: "Admin", surname: "Admin"},
    {id: 1, firstName: "Bert", surname: "Pintjens", email: "b"+hash("ert.pintjens")+"@hotmail.com"},
    {id: 2, firstName: "Narayan", surname: "Ahmed"},
    {id: 3, firstName: "Sascha", surname: "Staelens"},
    {id: 4, firstName: "Shourov", surname: "Vereecken"},
    {id: 5, firstName: "Jane", surname: "Doe", email: "j"+hash("ane.doe")+"@lost.not"},

];
const coreLoginData : LoginData[] = [
    {id: 0, user_id: 0, username: "Admin", password: hash("Admin123")},
    {id: 1, user_id: 1, username: "Bert", password: hash("Bert123")},
    {id: 2, user_id: 2, username: "Narayan", password: hash("Narayan123")},
    {id: 3, user_id: 3, username: "Sascha", password: hash("Sasha123")},
    {id: 4, user_id: 4, username: "Shourov", password: hash("Shourov123")},
    {id: 5, user_id: 5, username: "User1", password: hash("User1123")},
];
const cardsList = ():Promise<Set> => {
    return fetch("https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Adkm&unique=prints").then((e) => e.json());
};
let cards : CardS[] = [];
cardsList().then((set : Set)=>{

    let oracleIds : string[] = [];
    
    
    for (let card of set.data){
        let newCard : CardS = {
            id: "",
            variations: [],
            mana: card.color_identity,
            manacost: card.cmc,
            isLand: false
        }
        let variation : Variation = {
            id: card.id,
            count: 1
        }

        // cards.forEach((includedCard) => {

        //     if(includedCard.id === card.oracle_id){

        //         includedCard.variations.forEach((containedVariation) => {

        //             if(containedVariation.id === card.id){
        //                 containedVariation.count++;
        //             }})
        //     }
        //     else{

        //     }
        
        // });


        // if(!testDeck.cards){

        //     return

        // }
        // else{
        //     testDeck.cards.forEach((localCard) => {
        //         if(localCard.id == card.oracle_id){
        
        //         }
        //     })
        // }



        if(oracleIds.includes(card.oracle_id)){
            cards[oracleIds.indexOf(card.oracle_id)].variations.push(variation);
        }
        else{
            newCard.id = card.oracle_id;
            newCard.manacost = card.cmc;
            newCard.variations.push(variation);
            if(card.type_line.includes("Land")){
                newCard.isLand = true;
            }
            cards.push(newCard);
            oracleIds.push(card.oracle_id);
        }
    }

    console.table(cards);
     
}
);
const testDeck : Deck = { //58 Cards by scryfall ID's (The Deckmasters Set)
    id: 0,
    name: "Test Deck",
    cards: cards,
    coverCard: "34eb627d-d711-4c5b-a0b1-744ce0bb0cf0" //Card with highest rarety
}

const collectionChoise = ():string => {
    let choise : string = readLine.question("\nGo to:\n1:\tUsers\n2:\tDecks\n3:\tLoginData\n> ");
    let collection : string = "";
    switch(choise){
        case "1":
            return "users";
            break;
        case "2":
            return "decks";
            break;
        case "3":
            return "loginData";
            break;
        default:
            return collectionChoise();
            break;
    }
}

const main = async() =>{

    try{
        //Conect do DB
        await client.connect();
        console.log(`Connection to ${db.databaseName} DB succesful`);

        
        // Fill or reset
        let users : User[] = await db.collection('users').find<User>({}).toArray();
        if(readLine.keyInYN("Reset Users and LoginData? ")){
            await db.collection('users').deleteMany();
            await db.collection('users').insertMany(coreUsers);
            await db.collection('loginData').deleteMany();
            await db.collection('loginData').insertMany(coreLoginData)
            console.log("Users And LoginData Where Reset To The Core Values")
        }
        if(readLine.keyInYN('Reset Test Deck?')){
            await db.collection('decks').updateOne({id: 0}, {$set: testDeck});
            console.log("Test Deck Is Reset To Standard DKM Set")
        }

        const collectionView = async() => {
        // Direct to collection
        const collection = db.collection(collectionChoise());
        console.log(`Directed to ${collection.collectionName}`);

        if(readLine.keyInYN(`Show ${collection.collectionName}?`)){
            console.table(await collection.find({}).toArray());
        }
        await collectionView();
        }
        await collectionView();
    }
    catch (e : any){
        console.error(e.message);
    }
    finally{
        await client.close();
    }

}

main();


