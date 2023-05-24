import { MongoClient, ObjectId, Collection } from "mongodb";
import { CardS, Variation, Deck, Card, Set, ImageUris } from "./types";
import { fullHash, emailHash, getSet, setToCardSs, cardSsToDeck } from "./functions";
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


const coreUsers : User[] = [
    {id: 0, firstName: "Admin", surname: "Admin"},
    {id: 1, firstName: "Bert", surname: "Pintjens", email: emailHash("bert.pintjens@hotmail.com")},
    {id: 2, firstName: "Narayan", surname: "Ahmed"},
    {id: 3, firstName: "Sascha", surname: "Staelens"},
    {id: 4, firstName: "Shourov", surname: "Vereecken"},
    {id: 5, firstName: "Jane", surname: "Doe", email: emailHash("jane.doe@lost.not")},

];
const coreLoginData : LoginData[] = [
    {id: 0, user_id: 0, username: "Admin", password: fullHash("Admin123")},
    {id: 1, user_id: 1, username: "Bert", password: fullHash("Bert123")},
    {id: 2, user_id: 2, username: "Narayan", password: fullHash("Narayan123")},
    {id: 3, user_id: 3, username: "Sascha", password: fullHash("Sasha123")},
    {id: 4, user_id: 4, username: "Shourov", password: fullHash("Shourov123")},
    {id: 5, user_id: 5, username: "User1", password: fullHash("User1123")},
];
const testDeckUriArr : string[] = ["https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Adkm&unique=prints", "https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Apd2&unique=prints", "https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Aolgc&unique=prints", "https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Amed&unique=prints", "https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Ae02&unique=prints", "https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3Acmm&unique=prints"];



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
            if(readLine.keyInYN('All Test Decks?')){
                try{
                    for(let i : number = 0; i < testDeckUriArr.length; i++){
                        let currentDeck : Deck = 
                            cardSsToDeck(i, `Test Deck ${i+1}`, await setToCardSs(
                                    await getSet(testDeckUriArr[i])));
                        await db.collection('decks').updateOne({id: i}, {$set: currentDeck});
                        console.log(`Test Deck ${i+1} Reset To Standard`);
                    }
                }
                catch (e:any){
                    console.log("failed to reset deck");
                }
            }
            else{
                try{
                    let i : number = readLine.question("Deck id van het te resetten deck?");
                        let currentDeck : Deck = 
                            cardSsToDeck(i, `Test Deck ${i+1}`, await setToCardSs(
                                    await getSet(testDeckUriArr[i])));
                        await db.collection('decks').updateOne({id: i}, {$set: currentDeck});
                        console.log(`Test Deck ${i+1} Reset To Standard`);
                    
                }
                catch (e:any){
                    console.log("failed to reset deck");
                }
            }
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


