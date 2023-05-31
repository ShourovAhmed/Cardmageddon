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

app.locals.data = {};

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
        //let startTime = performance.now()
        
        await client.connect();
    
        const deckCollection= client.db("userData").collection("decks");
    
        const decksDatabase= await deckCollection.find<Deck>({}).toArray();
        
        let chosenDeck=decksDatabase[0];//later deckkeuze aanmaken
        let cards:CardS[]= chosenDeck.cards!;    //non-null assertion operator ? should work 
        //console.log(cards);
    
        
        let cardsIds:string[]=[]; 
        cardsIds=makeIdList(cards,cardsIds);    //this array only contains variableIds used for api
        
        
        let ListCardReady= makeCardListFromApi(cardsIds);//this caused long load
        console.log('\x1b[36m%s\x1b[0m',"deck loaded");

        //used to debug LoadTimes
        // let endTime = performance.now()
        // console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)
        
        
        return ListCardReady;
    
    }catch(e){
        console.error(e);
    }finally{
        client.close();
        
        
    }
    
}


//debugging load time
//let startTime = performance.now()
    

let ListCardReadyPreload=  LoadingDeck();

//let endTime = performance.now()

// console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)

let drawnCards:number=7;//startcount cards shown
let ListCardReady=ListCardReadyPreload;
app.locals.data =ListCardReady;//makes global varianle wich can be updated and accessed in all scopes//required for updating/randomizing from post scope -> get

app.get('/drawtest',async(req,res)=>{
    
    let ListCardReady=await ListCardReadyPreload;
    ListCardReady=app.locals.data;
    drawnCards=7;
    //let ListCardReady= await LoadingDeck();  //makes it run inside get
    
    //let ListCardReady=await ListCardReadyPreload;
    //ListCardReady= randomOrder(await ListCardReady!);
    ListCardReady=await ListCardReadyPreload;
    //let ListCardReady=randomOrder(await ListCardReadyPreload);
    drawnCards=7;
    
    

    


    ListCardReady=ListCardReady!.map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
    //this reshuffles but doesnt update te get?

    app.locals.data =ListCardReady;
    
    
    
    

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
    
   

    if(buttonType=='changeDeck'){
        res.send("not implemented yet")
    }
    if(buttonType=='NewHand'){

        let ListCardReady=await ListCardReadyPreload;
        //let ListCardReady=randomOrder(await ListCardReadyPreload);
        drawnCards=7;
        
        

        


        ListCardReady=ListCardReady!.map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
        //this reshuffles but doesnt update te get?

        app.locals.data =ListCardReady;
        
        
        
        
        
        
    

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards
        
        
    });
    }

    else{
        
        //drawcardstuff->
        
        drawnCards++;

        let ListCardReady=await ListCardReadyPreload;
        ListCardReady=app.locals.data;

        res.render("drawtest",{
            ListCardReady,
            drawnCards
            
                
        });}


        

});

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
