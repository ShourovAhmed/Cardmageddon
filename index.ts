import { MongoClient, ObjectId, Collection } from "mongodb";
import express from "express";
import ejs from "ejs";
import fetch from 'node-fetch';



import { Card} from "./dbMode";
import { log } from "console";
import { TIMEOUT } from "dns";
import { listenerCount } from "process";

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
interface simpleCardObject{
    name: string,
    img: string,
    rarity: string//might add something later
}

interface ListReadyDecksInterface{
   
    deckName:string,
    simpleCard:simpleCardObject[]

}

const app = express();

app.locals.data = {};

const uri: string =
    "mongodb+srv://Sascha:mongo123@cardmageddon.jjjci9m.mongodb.net/?retryWrites=true&w=majority";

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
    //let cardFromApi: string[]=[];//old
    let cardFromApi=[];
    cardFromApi = await response.json();
    
    
    return cardFromApi;       
}
let makeCardListFromApi =async(cardsIds:string[],simpleCard:simpleCardObject[]) => {


    let ListCardReady: any[]=[];       
    for(let i=0;i<cardsIds.length;i++){

        
        let cardObject=await getCardFromApi(cardsIds[i]);

        //ListCardReady.push(cardObject);   oldway
        
            simpleCard[i] = {
            name: cardObject.name,
            img: cardObject.image_uris.normal,
            rarity: cardObject.rarity
        };    


    }//makes array of cards in deck

    //random ordering:
    let randomizedListCardReady = simpleCard
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
   
    return simpleCard;
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
let LoadingDeck =async () => {
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
        
        let simpleCard:simpleCardObject[]=[];
        
        let ListCardReady= makeCardListFromApi(cardsIds,simpleCard);//this caused long load
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
let LoadingAllDecks =async () => {//will do as before but load all decks so cards wil be one space deeper inside the array


try{
        await client.connect();

        const deckCollection= client.db("userData").collection("decks");
    
        const decksDatabase= await deckCollection.find<Deck>({}).toArray();

        let ListReadyDecks:ListReadyDecksInterface[]=[];
        for(let i:number=0;i<decksDatabase.length;i++){
            
            let cards:CardS[]= decksDatabase[i].cards!; 
            let deckname:string=decksDatabase[i].name;
            console.log(deckname)
            //might need to add deck id here later+interface

            let cardsIds:string[]=[]; 
            cardsIds=makeIdList(cards,cardsIds);//list of ids neeeded for apicall later

            let simpleCard:simpleCardObject[]=[];
            let ListCardReady= await makeCardListFromApi(cardsIds,simpleCard);
            //simpleCard=ListCardReady!;
            
            ListReadyDecks[i]={
                deckName:deckname,
                simpleCard:[]
            }



            
            
            for(let j=0;j<ListCardReady.length;j++){
                ListReadyDecks[i].simpleCard.push(ListCardReady[j]);
            }
            
            //ListReadyDecks.push(await ListCardReady);
            console.log('\x1b[36m%s\x1b[0m',"deck "+i+" loaded");
            

        }
        //console.log(ListReadyDecks);
        return ListReadyDecks;


    }catch(e){
        console.error(e);
    }finally{
        client.close();
        
        
    }
}

//debugging load time
//let startTime = performance.now()
    

//let ListCardReadyPreload=  LoadingDeck();//OLD LOADS 1ST DECK ONLY

//let ListCardReadyPreload=await LoadingAllDecks();//loads alldecks
let iHatePromises =async () => {
    let ListCardReadyPreload=await LoadingAllDecks();
    return ListCardReadyPreload;

}
let ListCardReadyPreload:any=iHatePromises(); //to fix promiseissues?


//let endTime = performance.now()

// console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)
//let decksSelected:ListReadyDecksInterface=ListCardReadyPreload[0];
let drawnCards:number=7;//startcount cards shown
let selectedDeck:number=0;//default is first deck



// let deckSelecting =async (ListCardReadyPreload:ListReadyDecksInterface,deckChoice:number) => {
    
//     let allDecks:ListReadyDecksInterface=  ListCardReadyPreload;
//     console.log("readypreload:"+ListCardReadyPreload);
//     console.log("alldecks:"+allDecks);
//     //selectedDeck=allDecks[deckChoice];
//     // return selectedDeck;



// }
// let selectedDeck:ListReadyDecksInterface[]= 
//deckSelecting(ListCardReadyPreload,0);
let ListCardReady:ListReadyDecksInterface=ListCardReadyPreload
app.locals.data =ListCardReady;//makes global varianle wich can be updated and accessed in all scopes//required for updating/randomizing from post scope -> get
//console.log(app.locals.data);

app.get('/drawtest',async(req,res)=>{
    //console.log(app.locals.data);
    //let ListCardReady=await ListCardReadyPreload;//was enabled
    //console.log(ListCardReady);
    //let Decks=await app.locals.data;
    selectedDeck=0;
    //ListCardReady=Decks[selectedDeck];
    
    ListCardReady=await app.locals.data;
    console.log(ListCardReady);
    drawnCards=7;
    //let ListCardReady= await LoadingDeck();  //makes it run inside get
    
    //let ListCardReady=await ListCardReadyPreload;
    //ListCardReady= randomOrder(await ListCardReady!);
    //ListCardReady=await ListCardReadyPreload;//wasenabled
    //let ListCardReady=randomOrder(await ListCardReadyPreload);
    //drawnCards=7;
    
    

    


    // ListCardReady=ListCardReady!.map(value => ({ value, sort: Math.random() }))
    // .sort((a, b) => a.sort - b.sort)
    // .map(({ value }) => value);
    //reshuffles en updates to lacals

    //app.locals.data =ListCardReady;
    
    
    
    

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards,
        selectedDeck
        
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
        
        

        


        // ListCardReady=ListCardReady!.map(value => ({ value, sort: Math.random() }))
        // .sort((a, b) => a.sort - b.sort)
        // .map(({ value }) => value);
        
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
