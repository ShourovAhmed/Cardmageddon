import { MongoClient, ObjectId, Collection } from "mongodb";
import express from "express";
import ejs from "ejs";
import fetch from 'node-fetch';



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

app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));




let getCardFromApi= async (cardsid:string ) => {

//gets card object from id to api call
    let id= cardsid;
    let response = await fetch(`https://api.scryfall.com/cards/${id}`); 
    let cardFromApi: string[]=[];
    cardFromApi = await response.json();
    
    
    return cardFromApi;       
}
let makeCardListFromApi =async(cardsIds:string[]) => {


    let ListCardReady: any[]=[];       
    for(let i=0;i<cardsIds.length;i++){

        
        let cardObject=await getCardFromApi(cardsIds[i]);

        ListCardReady.push(cardObject);       


    }//makes array of cards in deck

    //random ordering:
    let randomizedListCardReady = ListCardReady
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
   
    return randomizedListCardReady;
}


let makeIdList=(cards:CardS[],cardsIds:string[]) => {

    //get array only containing varIds// needed for api

    for(let i=0;i<cards.length;i++){

        let card=cards[i].variations[0];
        
        
        

        cardsIds.push(card.id);



    }
    //console.log(`copyArray: ${cardToIds}`);
    return cardsIds;



}





app.get('/drawtest',async(req,res)=>{

try{
    await client.connect();

    const deckCollection= client.db("userData").collection("decks");

    



    const decksDatabase= await deckCollection.find<Deck>({}).toArray();
    
    let chosenDeck=decksDatabase[0];//later deckkeuze aanmaken
    let cards:CardS[]= chosenDeck.cards!;    //non-null assertion operator ? should work 
    //console.log(cards);

    
    let cardsIds:string[]=[]; 
    cardsIds=makeIdList(cards,cardsIds);    //this array only contains variableIds used for api


    let ListCardReady=await makeCardListFromApi(cardsIds);


    res.render("drawtest",{
        
        ListCardReady
    });

}catch(e){
    console.error(e);
}finally{
    client.close();
}

    
    

});

app.post("/drawtest", async(req,res)=>{
    let otherpostoption:boolean =false;
    if(otherpostoption){
        console.log("not implemented yet")
    }
    else{//drawcardstuff->

console.log("testtt")

    }


    res.render("drawtest",{
        
        
    });


    
    
    
    
});

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
