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
const shuffleArray = (array:any) => {
    // create a copy of the array so that the original array is not mutated
    
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

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
        if(cardObject.image_uris){

        //ListCardReady.push(cardObject);   oldway
        
            simpleCard[i] = {
            name: cardObject.name,
            img: cardObject.image_uris.normal,
            rarity: cardObject.rarity
        };    
    }  
    else{
        simpleCard[i] = {
            name: cardObject.name,
            //img: "https://cards.scryfall.io/normal/front/0/d/0d3c0c43-2d6d-49b8-a112-07611a23ae69.jpg",
            img:cardObject.card_faces[0].image_uris,
            rarity: cardObject.rarity
        }; 

    } 

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
    
    //ListCardReady=Decks[selectedDeck];
    
    let ListCardReady=await app.locals.data;
    //console.log(ListCardReady);
    drawnCards=7;
    selectedDeck=0;
    //let ListCardReady= await LoadingDeck();  //makes it run inside get
    
    //let ListCardReady=await ListCardReadyPreload;
    //ListCardReady= randomOrder(await ListCardReady!);
    //ListCardReady=await ListCardReadyPreload;//wasenabled
    //let ListCardReady=randomOrder(await ListCardReadyPreload);
    //drawnCards=7;
    
    

    


    // ListCardReady=ListCardReady!.map(value => ({ value, sort: Math.random() }))
    // .sort((a, b) => a.sort - b.sort)
    // .map(({ value }) => value);
    // reshuffles en updates to lacals

   
    

    //app.locals.data =ListCardReady;
    shuffleArray(ListCardReady[selectedDeck].simpleCard);
    app.locals.data =ListCardReady;
    
    
   
    

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards,
        selectedDeck
        
    });
    
    



});

app.post("/drawtest", async(req,res)=>{
    
    
    let buttonType:string= req.body.buttonType;
    //console.log(buttonType);
   
    
    // let ListCardReady:any[]=req.app.get("ListCardReady");
    
    //console.log(ListCardReady);
   //get list from get request?
    
   if(buttonType=='NewCard'){
        
    //drawcardstuff->
    
    drawnCards++;

    //let ListCardReady=await ListCardReadyPreload; //was enabled
    ListCardReady=app.locals.data;

    res.render("drawtest",{
        ListCardReady,
        drawnCards,
        selectedDeck
        
            
    });}

    if(buttonType=='changeDeck'){
        //res.send("not implemented yet")
        //let selectMenuThing=req.body;
        let selectMenuThing= req.body;//find value
        var selectedValue = selectMenuThing[Object.keys(selectMenuThing)[0]];//this gives selected value
        //console.log(selectMenuThing);
        //console.log(value);//this gives 
        //console.log(selectMenuThing.prefix);
        selectedDeck=selectedValue;

        let ListCardReady=await app.locals.data;
        
        drawnCards=7;
        shuffleArray(ListCardReady[selectedDeck].simpleCard);
        app.locals.data =ListCardReady;

        res.render("drawtest",{
        
            ListCardReady,
            drawnCards,
            selectedDeck
            
            
        });
    }
    if(buttonType=='NewHand'){

        //let ListCardReady=await ListCardReadyPreload;//was enabled
        let ListCardReady=await app.locals.data;
        
        drawnCards=7;          
        shuffleArray(ListCardReady[selectedDeck].simpleCard);
        //reshuffles en updates to lacals
         app.locals.data =ListCardReady;
        

    res.render("drawtest",{
        
        ListCardReady,
        drawnCards,
        selectedDeck
        
        
    });
    }

    


        

});

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
