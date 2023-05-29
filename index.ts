import { MongoClient, ObjectId, Collection } from "mongodb";
import express from "express";
import ejs from "ejs";
import fetch from 'node-fetch';



import { Card} from "./dbMode";
import { log } from "console";
import { TIMEOUT } from "dns";

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


let randomOrder=(cardsToRandomize:any[])=>{
    cardsToRandomize
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    return cardsToRandomize;
}

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
let LoadingDeck =async () => {//this was in GET
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
        console.log("deck loaded")
        return ListCardReady;
    
    }catch(e){
        console.error(e);
    }finally{
        client.close();
        
        
    }
    
}
let ListCardReadyPreload=  LoadingDeck();


//setTimeout(() => console.log(ListCardReady), 15000);

//NOTES
//  Now cards will preload but will not reset drawn cards
//  todo: remove boolclickthing or hide and remake Loadingdeckthing think drawn cards++ etc
// try randomizer inside ejs maybe?
// try not deleting maybe?


let drawnCards:number=7;//startcount cards shown
app.get('/drawtest',async(req,res)=>{
    
    //let ListCardReady= await LoadingDeck();  //makes it run inside get
    
    let ListCardReady=await ListCardReadyPreload;
    //randomOrder(ListCardReady!);
    

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards
        
    });
    
    



});

app.post("/drawtest", async(req,res)=>{
    
    
    let buttonType:string= req.body.buttonType;
    console.log(buttonType);
    
    // let ListCardReady:any[]=req.app.get("ListCardReady");
    
    //console.log(ListCardReady);
   //get list from get request?
    
   

    if(buttonType=='chance'){
        console.log("not implemented yet")
    }
    if(buttonType=='NewHand'){

        let ListCardReady=await ListCardReadyPreload;
        drawnCards=7;
        //ListCardReady=randomOrder(ListCardReady!);
        
    

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards
        
    });

    }

    else{
        
        //drawcardstuff->
        
        drawnCards++;

        let ListCardReady=await ListCardReadyPreload;


        res.render("drawtest",{
            ListCardReady,
            drawnCards
            
                
        });}


        

});

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
