import express from 'express';
import fetch from 'node-fetch';
import {MongoClient} from 'mongodb';
import {Deck, CardS, Info, CookieInfo, User, LoginData, simpleCardObject, ListReadyDecksInterface} from "./types";
import { render } from 'ejs';
import { getFreeId, getCard, cardToCardS, getDeckImages, getDeck, addOrRemoveCard, deckAccess, getDecks, emailHash, makeNewDeck, fullHash} from './functions';
import { maxNonLandCardcount, maxTotalCardsInDeck, mssg } from './staticValues';
import { log, table } from 'console';
import { title } from 'process';




//EXPRESS
const session = require('express-session')
const app = express();


app.set("port", 3000);
app.set("view engine", "ejs");
app.use(express.static("public"));
// Om uit body te lezen (voor post)
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));


//MONGO
const uri : string =
    "mongodb+srv://admin:admin@cardmageddon.jjjci9m.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
export const db = client.db("userData");

let pics = [{name: '', img: '', rarity: '', id: '', multipleCards: false, doubleSided: false, cardFace: 0 }];
let pageNumber: number = 0;

//let pics = [{name: '', img: '', rarity: ''}];
export let cookieInfo : CookieInfo = new CookieInfo;

app.get("//:id", async(req, res) =>{
    let loginData : LoginData|null = await db.collection("loginData").findOne<LoginData>({user_id: parseInt(req.params.id)});
    cookieInfo = new CookieInfo(loginData?.username, loginData?.user_id, true);
    res.render("landingPage", {title: "Landingpage", info: new Info(true, mssg+cookieInfo.username)});
})

app.get("/", (req, res) =>{
    res.render("landingPage");
})

app.post("/", async(req, res) =>{
    let info : Info = new Info();
    if(cookieInfo.verified){
        info.succes = true;
        info.message = "Je login was nog actief";
    }
    else if(req.body.cookie != "on"){
        info.message = "You realy need to except out evil cookie."; 
    }
    else{
        let username = req.body.username;
        let password = fullHash(req.body.password);
    
        let loginData : LoginData|null = await db.collection("loginData").findOne<LoginData>({username: username});
        if(loginData === null || loginData.password != password){
            info.message = "Autentificatie mislukt.";
        }
        else{
            cookieInfo.id = loginData.user_id;
            cookieInfo.username = loginData.username;
            cookieInfo.verified = true;
            info.succes = true;
            info.message = `Welkom ${cookieInfo.username}`; 
        }
    }
    log("login");
    console.table(cookieInfo);
    res.render("landingPage", {title: "Landingpage", info: info});
})

app.get("/logout", (req, res) =>{
    cookieInfo = new CookieInfo;
    log("logout");
    table(cookieInfo);
    res.redirect("/");
})

app.use((req, res, next) => {
    if(cookieInfo.verified){
        next();
    }
    else{
        res.render("landingPage", {titel: "Landingpage", info: new Info(false, "Toegang geweigerd")}); 
    }
    
});

app.get("/home", (req, res) => {  

    // Paging
    const cardsPerPage = 10;
    pageNumber = parseInt(req.query.page as string) || 1;
  
    const startIdx = (pageNumber - 1) * cardsPerPage;
    const endIdx = startIdx + cardsPerPage;
    const shownCards = pics.slice(startIdx, endIdx);
  
    const totalPages = Math.ceil(pics.length / cardsPerPage);


    res.render("homepage", {
    cards: shownCards,
    pageNumber,
    totalPages
  });
});


app.post("/home", async (req, res) => {

    try{
        // API Request
        let text = req.body.search;
        if(text != '')
            console.log(text);
        let response = await fetch(`https://api.scryfall.com/cards/search?q=lore=${text}`); // Lore zoekt overal op kaart
        let cards = await response.json();
        //console.log(cards);

        if(cards.object != "error"){
            pics = [];
            let total_cards = cards.total_cards;
            let maxCardsPerRequest = 175; // request limit per pagina van scryfall
            if(total_cards > maxCardsPerRequest)
            {        
                total_cards = maxCardsPerRequest;
            }

            for (let i = 0; i < total_cards; i++){

                if(cards.data[i].set_type == "memorabilia" || cards.data[i].set_type == "minigame"){
                    total_cards--;
                    continue;
                }

                // 1. Normale kaarten
                if(!cards.data[i].card_faces){
                    pics.push({
                        name: cards.data[i].name,
                        img: cards.data[i].image_uris.normal,
                        rarity: cards.data[i].rarity,
                        id: cards.data[i].id,
                        multipleCards: false,
                        doubleSided: false,
                        cardFace: 0
                    });
                }

                // 2. Niet normale kaarten
                else{
                    let doubleSided = false;
                    for(let j = 0; j < cards.data[i].card_faces.length; j++){
                        if(cards.data[i].card_faces[j].image_uris){
                            doubleSided = true;
                        }
                    }

                    // 2.1 Kaarten met 2 (of meer??) kaarten aan 1 kant
                    if(!doubleSided){
                        pics.push({
                            name: cards.data[i].name,
                            img: cards.data[i].image_uris.normal,
                            rarity: cards.data[i].rarity,
                            id: cards.data[i].id,
                            multipleCards: true,
                            doubleSided: false,
                            cardFace: 0
                        });
                    }

                    // 2.2 Dubbelzijdige kaarten
                    else{
                        for(let j = 0; j < cards.data[i].card_faces.length; j++){
                            pics.push({
                                name: cards.data[i].name,
                                img: cards.data[i].card_faces[j].image_uris.normal,
                                rarity: cards.data[i].rarity,
                                id: cards.data[i].id,
                                multipleCards: true,
                                doubleSided: true,
                                cardFace: j
                            });
                        }
                    }
                }       
            }
            
            // Paging
            const cardsPerPage: number = 10;
            pageNumber = parseInt(req.query.page as string) || 1;
        
            const startIdx = (pageNumber - 1) * cardsPerPage;
            const endIdx = startIdx + cardsPerPage;
            const shownCards = pics.slice(startIdx, endIdx);
        
            const totalPages = Math.ceil(pics.length / cardsPerPage);
            console.log("Sliced");
            //console.table(shownCards, ['name', 'rarity']);
                    
                
            console.table(pics, ["name", "multipleCards", "doubleSided"]);
            return res.render("homepage", {
                cards: shownCards,
                pageNumber,
                totalPages
            });

        }            
        

        else{
            return res.render("homepage", {error: "Your query didn’t match any cards"});
        }
    }

    catch(e:any){
        console.log(e);
    }
    
});

app.get("/cardDetail/:id", async (req, res) => {


    // Get decknames for dropdown menu & all cards from all decks for text
    let decksDb = await db.collection("decks").find<Deck>({}).toArray();
    let cards = [];
    for(let i = 0; i< decksDb.length; i++){
        for(let j = 0; j< decksDb[i].cards.length; j++){
            cards.push({cardId: decksDb[i].cards[j].variations[0].id, deckName: decksDb[i].name});
        }
    }


    let decks = [];
    for(let deck of decksDb){
        decks.push(deck.name);
    }

    let id: number = parseInt(req.params.id);
    if(pageNumber > 1){
        id += (pageNumber - 1) * 10;
    }
    // console.log("page: " + pageNumber);
    // console.log("id: " + id);

    let response = await fetch(`https://api.scryfall.com/cards/${pics[id].id}`);
    let fullCard: any = await response.json();

    //console.log(fullCard);

    let cardRarity = capitalizeFirstLetter(fullCard.rarity);

    // Capitalize and space out all legalities
    for(let l in fullCard.legalities){

        // Get every value of the object properties and split it (if needed)
        let legality = fullCard.legalities[l];
        let splitted = legality.split("_");

        // Put each value in a new capitalized array
        let capitalized = [];
        for(let s of splitted){
            capitalized.push(capitalizeFirstLetter(s));
        }
        
        // Combine each array to one single string, with spaces in between
        let newLegality = "";
        for (let c of capitalized){
            newLegality+=c + " ";
        }
        
        // Replace the old values with the new capitalized and spaced out values
        fullCard.legalities[l] = newLegality;
        //console.log(fullCard.legalities[l]);
  
    }

    let card = {};
    let card2 = null;

    // Normale kaart
    if(!pics[id].multipleCards && !pics[id].doubleSided){
        
        let cardManaCost = splitMana(fullCard.mana_cost);
        let cardText: string[] = fullCard.oracle_text.split("\n");

        card = {
            name: fullCard.name,
            manaCost: cardManaCost,
            cmc: fullCard.cmc,
            colorId: fullCard.color_identity,
            type: fullCard.type_line,
            text: cardText,
            rarity: cardRarity,
            power: fullCard.power,
            toughness: fullCard.toughness,
            exp: fullCard.set_name, 
            flavorText: fullCard.flavor_text,
            artist: fullCard.artist,
            legality: fullCard.legalities,
        }
    }

    else if (pics[id].multipleCards && !pics[id].doubleSided){

        let cardManaCost = splitMana(fullCard.card_faces[pics[id].cardFace].mana_cost);
        let cardManaCost2 = splitMana(fullCard.card_faces[pics[id].cardFace+1].mana_cost);
        let cardText: string[] = fullCard.card_faces[pics[id].cardFace].oracle_text.split("\n");
        let cardText2: string[] = fullCard.card_faces[pics[id].cardFace+1].oracle_text.split("\n");

        card = {
            name: fullCard.card_faces[pics[id].cardFace].name,
            manaCost: cardManaCost,
            cmc: fullCard.cmc,
            colorId: fullCard.color_identity,
            type: fullCard.card_faces[pics[id].cardFace].type_line,
            text: cardText,
            rarity: cardRarity,
            power: fullCard.card_faces[pics[id].cardFace].power,
            toughness: fullCard.card_faces[pics[id].cardFace].toughness,
            exp: fullCard.set_name,
            flavorText: fullCard.card_faces[pics[id].cardFace].flavor_text,
            artist: fullCard.artist,
            legality: fullCard.legalities,
        }

        card2 = {
            name: fullCard.card_faces[pics[id].cardFace+1].name,
            manaCost: cardManaCost2,
            cmc: fullCard.cmc,
            colorId: fullCard.color_identity,
            type: fullCard.card_faces[pics[id].cardFace+1].type_line,
            text: cardText2,
            rarity: cardRarity,
            power: fullCard.card_faces[pics[id].cardFace+1].power,
            toughness: fullCard.card_faces[pics[id].cardFace+1].toughness,
            exp: fullCard.set_name,
            flavorText: fullCard.card_faces[pics[id].cardFace+1].flavor_text,
            artist: fullCard.artist,
            legality: fullCard.legalities,
        }

    }
    else{

        let cardManaCost = splitMana(fullCard.card_faces[pics[id].cardFace].mana_cost);
        let cardText: string[] = fullCard.card_faces[pics[id].cardFace].oracle_text.split("\n");

        card = {
            name: fullCard.card_faces[pics[id].cardFace].name,
            manaCost: cardManaCost,
            cmc: fullCard.cmc,
            colorId: fullCard.color_identity,
            type: fullCard.card_faces[pics[id].cardFace].type_line,
            text: cardText,
            rarity: cardRarity,
            power: fullCard.card_faces[pics[id].cardFace].power,
            toughness: fullCard.card_faces[pics[id].cardFace].toughness,
            exp: fullCard.set_name,
            flavorText: fullCard.card_faces[pics[id].cardFace].flavor_text,
            artist: fullCard.artist,
            legality: fullCard.legalities,
        }

    }

    

    res.render("cardDetail", {card: card, card2: card2, localCard: pics[id], decks: decksDb, cards: cards});

    
});

app.get("/decks", async (req,res) =>{
    
    res.render("decks", {title: "Decks", decks: await getDecks(cookieInfo.id)});

});

app.post("/decks", async (req,res) =>{
    let newDeckName : string = req.body.deckName;

    let newDeck : Deck = await makeNewDeck(req.body.deckName, cookieInfo.id);

    try{
        db.collection("decks").insertOne(newDeck);
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
        let info : Info = new Info(true, `Deck: "${newDeckName}" Toegevoegd`);
        res.render("decks", {title: "Decks", decks: await getDecks(cookieInfo.id), info: info});
    }
    catch(e: any){
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
        let info : Info = new Info(false, `Toevoegen mislukt`)
        res.render("decks", {title: "Decks", decks: await getDecks(cookieInfo.id), info: info});
    }
});



app.get("/deck/:id", async(req,res) =>{
    let info : Info = new Info(false, "Er ging iets mis");
    
    let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});
    if (!deck){
        console.log(`Ongeldig Deck ID: ${req.params.id}`);
        res.render('decks', {title: "Decks", decks: await getDecks(cookieInfo.id), info: new Info(false, "Ongeldig Deck ID")});
    }
    else{
        res.render('deck', {title: "Deck", deck: deck});
    }
});

// DECKOPTIONS
app.post("/deck", async (req,res) =>{
let deckId : number = parseInt(req.body.deckId);
if(deckId - parseFloat(req.body.deckId) != 0){
    res.render("decks", {title: "Decks", decks: await getDecks(cookieInfo.id), info: new Info(false, "Foutief Deck ID")});
}

let accessLvl : number = deckAccess(deckId)
// REMOVE DECK

// RENAME DECK

// SET DECK IMAGE

// DUPLICATE DECK


});
//update cardCount from deck
app.get("/deck/:deckId/:cardId/:amount", async(req,res) =>{

    let amount : number = parseFloat(req.params.amount);
    let deckId : number = parseInt(req.params.deckId);
    let cardId : string = req.params.cardId;

    try{
        if(amount%1 != 0){
            throw new Info(false, `Hoeveelheid is geen getal`);
        }
        if(deckId != parseFloat(req.params.deckId)){
            throw new Info(false, "Foutief deck ID");
        }
        let info : Info = await addOrRemoveCard(deckId, cardId, amount);

        res.render("deck", {title: "Deck", deck: await getDeck(deckId), info: info})
    }
    catch (e){
       res.render("deck", {title: "Deck", deck: await getDeck(deckId), info: e}) 
    }

});

// START DECK

app.post("/deck/:deckId", async(req,res)=>{

    let deckId : number = parseInt(req.params.deckId);
    log(deckId);
    if(deckId - parseFloat(req.params.deckId) != 0){
        res.render("decks", {title: "Decks", decks: await getDecks(cookieInfo.id), info: new Info(false, "Foutief Deck ID")});
    }
    else if(req.body.removeDeck){ //Delete Deck
        await db.collection("users").updateOne({id: cookieInfo.id}, {$pullAll: {decks: [deckId]}});
        await db.collection("decks").deleteOne({id: parseInt(req.params.deckId)});

        res.redirect("/decks");
    }
    else{ // Update deck name
        await db.collection("decks").updateOne({id: parseInt(req.params.deckId)},{$set:{name: req.body.deckName}});
        res.redirect(`/deck/${req.params.deckId}`);
    }
 
}); 
// END DECK




let deckImages : string[] = [];
let imageIndex : number = 0;
app.get("/deckImage/:id", async(req,res) =>{
    let deckId : number = parseInt(req.params.id);
    let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});
    let info : Info = {
        succes: false,
        message: ""
    }

    if (!deck){
        info.message = `Kon deck met id ${deckId} niet vinden`
        res.render(`/deck/${deckId}`, {info: info});
    }
    else if(!deck.cards){
        console.log("fout");
        console.log(`Geen kaarten in dit deck`);
        res.redirect('/404');
    }
    else{
        deckImages = getDeckImages(deck);
    }
    res.render('deck-image', {title: "Deck Image", image: deckImages[imageIndex]});
});
app.post("/deckImage/:deckId/", async(req,res) =>{

    if(req.body.pickImage){
        console.log(deckImages[imageIndex]);
        await db.collection("decks").updateOne({id: parseInt(req.params.deckId)}, {$set: {coverCard: deckImages[imageIndex]}});
        res.redirect(`/deck/${req.params.deckId}`);
    }
    else{
        if(req.body.next){
            imageIndex++;
            if(imageIndex >= deckImages.length){ 
                imageIndex = 0;
            }
        }
        else if(req.body.previous){
            imageIndex--;
            if(imageIndex < 0){
                imageIndex = deckImages.length-1;
            }
        }
        res.render("deck-image", {title: "Deck Image", image: deckImages[imageIndex]});
    }
 
});



app.get("/cardDetails/:id", async(req,res) =>{
    //to test links
    console.log(req.params.id);
    res.redirect("/404");
});
app.get("/drawtest/:deckId", async(req,res) => {
    //to test links
    res.redirect("/404");
});

//Drawtest

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
    }
}
let iHatePromises =async () => {
    let ListCardReadyPreload=await LoadingAllDecks();
    return ListCardReadyPreload;

}
let ListCardReadyPreload:any=iHatePromises(); //to fix promiseissues?

let drawnCards:number=7;//startcount cards shown
let selectedDeck:number=0;//default is first deck

let ListCardReady:ListReadyDecksInterface=ListCardReadyPreload
app.locals.data =ListCardReady;//makes global varianle wich can be updated and accessed in all scopes//required for updating/randomizing from post scope -> get


app.get('/drawtest',async(req,res)=>{
    
    let ListCardReady=await app.locals.data;
    
    drawnCards=7;
    selectedDeck=0;
    //app.locals.data =ListCardReady;
    shuffleArray(ListCardReady[selectedDeck].simpleCard);
    app.locals.data =ListCardReady;
    
    res.render("drawtest",{

        title: "Drawtest",
        ListCardReady,
        drawnCards,
        selectedDeck
        
    });
    
});

app.post("/drawtest", async(req,res)=>{
    
    
    let buttonType:string= req.body.buttonType;
    //console.log(buttonType);
    
   if(buttonType=='NewCard'){
        
    //drawcardstuff->
    
    drawnCards++;
    ListCardReady=app.locals.data;

    res.render("drawtest",{

        title: "Drawtest",
        ListCardReady,
        drawnCards,
        selectedDeck       
    });}

    if(buttonType=='changeDeck'){

        let selectMenuThing= req.body;//find value
        var selectedValue = selectMenuThing[Object.keys(selectMenuThing)[0]];//this gives selected value

        selectedDeck=selectedValue;

        let ListCardReady=await app.locals.data;
        
        drawnCards=7;
        shuffleArray(ListCardReady[selectedDeck].simpleCard);
        app.locals.data =ListCardReady;

        res.render("drawtest",{
        
            title: "Drawtest",
            ListCardReady,
            drawnCards,
            selectedDeck  
        });
    }
    if(buttonType=='NewHand'){
        let ListCardReady=await app.locals.data;
        
        drawnCards=7;          
        shuffleArray(ListCardReady[selectedDeck].simpleCard);
        //reshuffles en updates to lacals
         app.locals.data =ListCardReady;
    res.render("drawtest",{

        title: "Drawtest",
        ListCardReady,
        drawnCards,
        selectedDeck 
    });
    }
});


// -------------- //
// 404
app.use((req, res) => {
    res.status(404);
    res.render("bad-request", {title: "404"});
    }
  );

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);

const splitMana = (mana: string) => {
    let splitted = mana.split(/[{}]/g).filter(item => item !== ''); // doet de '{' en '}' symbolen weg en filtert dan ook de lege plekken uit de array
    //TODO ook de half mana symbolen toevoegen bv B/R
    
    return splitted;
}

const capitalizeFirstLetter = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
}