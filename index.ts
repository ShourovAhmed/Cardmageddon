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

//making funct to get image from certain id (from variation in db)

let getPic= async (varId:string, ) => {


    let id= varId;
    let response = await fetch(`https://api.scryfall.com/cards/${id}`); 
    let card = await response.json();
    let cardImg=card.image_uris.normal
    //console.log(`getPic:${cardImg}`);
    return cardImg;     //returns the img src needed. 
    
    
}


let makeIdList=(cards:CardS[],cardsIds:string[]) => {

    

    for(let i=0;i<cards.length;i++){

        let card=cards[i].variations[0];
        
        
        

        cardsIds.push(card.id);



    }
    //console.log(`copyArray: ${cardToIds}`);
    return cardsIds;



}

let makeImgList =async(cardsIds:string[],cardImgs:string[]) => {

    for(let i=0;i<cardsIds.length;i++){

        let cardImage=await getPic(cardsIds[i]);

        cardImgs.push(cardImage);       


    }
    //console.log(`listimages: ${cardImgs}`);
    return cardImgs;


}



app.get('/drawtest',async(req,res)=>{

try{
    await client.connect();

    let deckCollection= client.db("userData").collection("decks");

    let decks =await deckCollection.find<Deck>({}).toArray();//REMOVE only needed TEMP untill removind decks



    let decksDatabase= await deckCollection.find<Deck>({}).toArray();
    
    let chosenDeck=decksDatabase[0];//later deckkeuze aanmaken
    let cards:CardS[]= chosenDeck.cards!    //non-null assertion operator ? might work now

    
    let cardsIds:string[]=[]; 
    cardsIds=makeIdList(cards,cardsIds);    //this array only contains variableIds used for api//also allows deleting in later uses without touching original Database


    let cardImgs:string[]=[]; 
    cardImgs=await makeImgList(cardsIds,cardImgs); 

    //console.log("All Ids deck 1:"+ cardsIds);
    






///----Notes for next:   We have Ids wich can be deleted from and we have api calll function, 
//                        so now i combine in loop etc later add deck selector?
    







    // let id="5e2465d3-405d-487d-b6e9-d2ec8b920201";      //for early testing only

    // let response = await fetch(`https://api.scryfall.com/cards/${id}`);  //finds card on Id  cant find on id from db but can find it if using variant id

    // let card = await response.json();

    // console.log(card.image_uris.normal);

    let cardImg= await getPic("5e2465d3-405d-487d-b6e9-d2ec8b920201");




    //TESTING ARRAY THINGY IGNORE
/*
    let arr1: string[] = ["one", "two", "three"];
    let arr2=arr1;
    let index= arr2.indexOf("two");
    if(index!=-1){
        arr2.splice(index,1);
    }

    console.log(arr1);
    console.log(arr2);

    */
    
    

    res.render("drawtest",{
        decks: decks,
        cardImg,    //remove later
        cardImgs:cardImgs
    });

}catch(e){
    console.error(e);
}finally{
    client.close();
}

    
    

})

app.listen(app.get("port"), ()=>console.log( `[server] http://localhost:` + app.get("port")));
