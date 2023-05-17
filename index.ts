import { MongoClient, ObjectId, Collection } from "mongodb";
import express from "express";
import ejs from "ejs";
//const axios=require('axios');

import { Card} from "./dbMode";
import { log } from "console";

interface Deck{
    _id?: ObjectId,
    id: number,
    name: string,
    cards?: CardS[],
    coverCard?: string, //cardID???
}
interface CardS {   // kleine samenvatting
    id:         string, // Oracle ID
    variations: Variation[],
    mana:       string[],
    manacost:   number,
    isLand:     boolean
}

interface Variation{
    id:     string, // scryfall ID
    count:  number
}

const app = express();

const uri: string =
    "mongodb+srv://admin:admin@cardmageddon.jjjci9m.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri);

const db = client.db("userData");

app.set("port", 3000);
app.set("view engine", "ejs");

app.use('*/public',express.static('public/'));







app.get('/drawtest',async(req,res)=>{

try{
    await client.connect();

    let deckCollection= client.db("userData").collection("decks");

    let decks= await deckCollection.find<Deck>({}).toArray();

    //axios

    

    res.render("drawtest",{
        decks: decks
    });

}catch(e){
    console.error(e);
}finally{
    client.close();
}

    
    

})

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
