import express from 'express';
import fetch from 'node-fetch';
import {MongoClient} from 'mongodb';
import {Deck, CardS, Info, CookieInfo, User, LoginData, simpleCardObject, ListReadyDecksInterface} from "./types";
import { render } from 'ejs';

import { fullHash, emailHash, deckAccess, capitalizeFirstLetter, freeUsername, registerUser } from './functions/coreFunctions';
import { splitMana } from './functions/conversionFunctions';
import { iHatePromises, shuffleArray } from './functions/drawFunctions';
import { getCard } from './functions/scryfallFunctions';
import { addOrRemoveCard, makeNewDeck, getDeckImages, copyDeck } from './functions/deckFunctions';
import { getDeck, getDecks, connect, exit } from './functions/mongoFunctions';

import { db, client, maxNonLandCardcount, maxTotalCardsInDeck, mssg } from './staticValues';
import { log, table } from 'console';
import { title } from 'process';




//EXPRESS
const app = express(); 


app.set("port", 3000);
app.set("view engine", "ejs");
app.use(express.static("public"));
// Om uit body te lezen (voor post)
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));




let pics = [{name: '', img: '', rarity: '', id: '', multipleCards: false, doubleSided: false, cardFace: 0 }];
let pageNumber: number = 0;

//let pics = [{name: '', img: '', rarity: ''}];
export let cookieInfo : CookieInfo = new CookieInfo;

app.get("//:id", async(req, res) =>{
    let loginData : LoginData|null = await db.collection("loginData").findOne<LoginData>({user_id: parseInt(req.params.id)});
    cookieInfo = new CookieInfo(loginData?.username, loginData?.user_id, true);
    res.render("landingPage", {title: "Landingpage", info: new Info(true, mssg+cookieInfo.username)});
});

app.get("/", (req, res) =>{
    res.render("landingPage");
});

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

app.get("/account/new", (req, res) =>{
    res.render("new-user-start");
})
app.post("/account/new", async(req, res) =>{
    
    if(!await freeUsername(req.body.username)){
        res.render("new-user-start", {title: "Registration", info: new Info(false, "Naam al in gebruik.")});

    }
    if(req.body.password1 && req.body.password2){
        if(req.body.password1 != req.body.password2){
            res.render("new-user-finish", {title: "Registration", username: req.body.username, info: new Info(false, "paswoorden komen niet overeen.")});
            return;
        }
        if(req.body.termsOfAgrement != "on"){
            res.render("new-user-finish", {title: "Registration", username: req.body.username, password: req.body.password1, info: new Info(false, "Accepteer de voorwaarden")});
            return;
        }

        cookieInfo = await registerUser(req.body.username, await fullHash(req.body.password1))
        
        if(cookieInfo.verified){
            res.render("landingPage", {info: new Info(true, `Welkom ${cookieInfo.username}`)});
        }
        else{
            res.render("landingPage", {info: new Info(false, `Registratie mislukt`)});
        }

    }
    else{
        res.render("new-user-finish", {title: "Registration", username: req.body.username});
    }
    
})
app.get(("/termsOfCondition"), (req, res) => {
    res.render("termsOfConditions");
});

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
                    
                
            //console.table(pics, ["name", "multipleCards", "doubleSided"]);
            return res.render("homepage", {
                cards: shownCards,
                pageNumber,
                totalPages
            });

        }            
        

        else{
            pics = [];
            return res.render("homepage", {error: "Your query didn’t match any cards"});
        }
    }

    catch(e:any){
        console.log(e);
    }
    
});

app.get("/cardDetail/:id", async (req, res) => {
    
    //let user: string = cookieInfo.username;
    let userId: number = cookieInfo.id;

    let users = await db.collection("users").find<User>({}).toArray();

    let userDecks = [];
    for (let i = 0; i< users.length; i++){
        if(users[i].id == userId){
            for (let deckId of users[i].decks){
                userDecks.push(deckId);
            }
        }
    }

// Get decknames for dropdown menu & all cards from all decks for text
    let decksDb = await db.collection("decks").find<Deck>({}).toArray();
    let decks: any = [];

    // Add first 6 test decks
    let cards = [];
    for(let i = 0; i< 6; i++){
        for(let j = 0; j< decksDb[i].cards.length; j++){
            cards.push({cardId: decksDb[i].cards[j].variations[0].id, deckName: decksDb[i].name});
        }
        decks.push({id: i, name: decksDb[i].name});
    }


    // Add user decks + Specials deck
    for(let i = 6; i < decksDb.length; i++){

        // Specials deck
        if(decksDb[i].id == 9){
            for(let j = 0; j< decksDb[i].cards.length; j++){
                cards.push({cardId: decksDb[i].cards[j].variations[0].id, deckName: decksDb[i].name});
            }
            decks.push({id: 9, name: decksDb[i].name});
        }

        // Userdecks
        for(let j = 0; j < userDecks.length; j++){
            if(userDecks[j] == decksDb[i].id){
                for(let k = 0; k < decksDb[i].cards.length; k++){
                    cards.push({cardId: decksDb[i].cards[k].variations[0].id, deckName: decksDb[i].name});
                }
                decks.push({id: userDecks[j], name: decksDb[i].name});
            }
        }
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

    

    res.render("cardDetail", {card: card, card2: card2, localCard: pics[id], decks: decks, cards: cards});

    
});

try{

    app.get("/decks", async (req,res) =>{
    
        res.render("decks", {title: "Decks", decks: await getDecks()});
    
    });
    
    app.post("/decks", async (req,res) =>{
        let newDeckName : string = req.body.deckName;
    
        let newDeck : Deck = await makeNewDeck(req.body.deckName, cookieInfo.id);
    
        try{
            await db.collection("decks").insertOne(newDeck);
            let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
            let info : Info = new Info(true, `Deck: "${newDeckName}" Toegevoegd`);
            res.render("decks", {title: "Decks", decks: await getDecks(), info: info});
        }
        catch(e: any){
            let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
            let info : Info = new Info(false, `Toevoegen mislukt`)
            res.render("decks", {title: "Decks", decks: await getDecks(), info: info});
        }
    });
    
    
    ///---START DECK---///
    app.get("/deck/:id", async(req,res) =>{
        let info : Info = new Info(false, "Er ging iets mis");
        let deckId : number = parseInt(req.params.id);
    
        // CHECK INPUT
            if(deckId - parseFloat(req.params.id) != 0){
                res.render("decks", {title: "Decks", decks: await getDecks(), info: new Info(false, "Foutief Deck ID")});
                return;
            }
    
        try{
            let deck : Deck|null = await getDeck(deckId);
    
            res.render('deck', {title: "Deck", deck: deck});
    
        }
        catch (e){
            res.render('decks', {title: "Decks", decks: await getDecks(), info: e});
        }
    });
    
    // DECKOPTIONS
    
    let deckImages : string[] = [];
    let imageIndex : number = 0;
    app.get("/deckImage/:id", async(req,res) =>{
        imageIndex = 0;
        let deckId : number = parseInt(req.params.id);
        let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});
        let info : Info = new Info;
    
        if (!deck){
            info.message = `Kon deck met id ${deckId} niet vinden`
            res.render(`/deck/${deckId}`, {info: info});
        }
        else{
            deckImages = getDeckImages(deck);
        }
        res.render('deck-image', {title: "Deck Image", image: deckImages[imageIndex], deckId: req.params.id});
    });
    
    app.post("/deck/:deckId", async(req,res)=>{
    
        let deckId : number = parseInt(req.params.deckId);
    
    // CHECK INPUT
        if(deckId - parseFloat(req.params.deckId) != 0){
            res.render("decks", {title: "Decks", decks: await getDecks(), info: new Info(false, "Foutief Deck ID")});
            return;
        }
    
        let accessLvl : number = await deckAccess(deckId);
    
    // Needs to be improved later, works just fine for now
    /// FORM HERE
        if(req.body.deckImage){
            if(req.body.next){
                imageIndex++;
                if(imageIndex >= deckImages.length){ 
                    imageIndex = 0;
                }
                res.render("deck-image", {title: "Deck Image", image: deckImages[imageIndex], deckId: req.params.deckId});
                return;
            }
            else if(req.body.previous){
                imageIndex--;
                if(imageIndex < 0){
                    imageIndex = deckImages.length-1;
                }
                res.render("deck-image", {title: "Deck Image", image: deckImages[imageIndex], deckId: req.params.deckId});
                return;
            }
    
        }
    ///TO HERE
    
    // LVL 1 ACCESS
    // DUPLICATE DECK
    if(req.body.deckCopy){
    
        let info = await copyDeck(deckId, req.body.deckName); 
        if(info.direct){ 
            deckId = info.direct;
        }
        res.render("deck", {title: "deck", deck: await getDeck(deckId), info: info});
        return;
    }
    
    
    // LVL 2 ACCESS
    if(accessLvl < 2){ 
        res.render("deck", {title: "deck", deck: await getDeck(deckId), info: new Info(false, "U hebt enkel lees en kopieer recht voor dit deck.")});
        return;
    }
    
    // SET DECK IMAGE
    if(req.body.pickImage){
        console.log(deckImages[imageIndex]);
        await db.collection("decks").updateOne({id: parseInt(req.params.deckId)}, {$set: {coverCard: deckImages[imageIndex]}});
        res.render("deck", {title: "Deck", deck: await getDeck(deckId), info: new Info(true, "Nieuwe Deckcover Ingesteld")});
        return;
    }
    // RENAME DECK
    if(req.body.deckRename){
        // Update deck name
        await db.collection("decks").updateOne({id: parseInt(req.params.deckId)},{$set:{name: req.body.deckName}});
        res.render("deck", {title: "Deck", deck: await getDeck(deckId), info: new Info(true, `Deck hernoemt naar: ${req.body.deckName}`)});
        return;
    }
    
    // LVL 3 ACCESS
    if(accessLvl < 3){
        res.render("deck", {title: "deck", deck: await getDeck(deckId), info: new Info(false, "U hebt niet voldoende rechten om dit deck te verwijderen")});
        return;
    }
    // REMOVE DECK
        if(req.body.removeDeck){ //Delete Deck
        await db.collection("users").updateOne({id: cookieInfo.id}, {$pullAll: {decks: [deckId]}});
        await db.collection("decks").deleteOne({id: parseInt(req.params.deckId)});
    
        res.render("decks", {title: "Decks", decks: await getDecks(), info: new Info(true, `Deck verwijderd`)});
        return;
    }
    
    
    });
    
    //ADD OR REMOVE CARD
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
}
catch (e: any){
    console.error(e.message);
    app.use( async (req, res) => {
        res.status(500);
        res.render("decks", {title: "Decks", decks: await getDecks(), info: new Info(false, "Er ging iets mis")});
        }
      );
}

///---END DECK---///


//Drawtest


// // !!!!!!!!!!!!! ///
//let ListCardReadyPreload:any= []; 
// // !!!!!!!!!!!!! ///




let ListCardReadyPreload:any=iHatePromises(); //to fix promiseissues?

let drawnCards:number=7;//startcount cards shown
let selectedDeck:number=0;//default is first deck


let ListCardReady:ListReadyDecksInterface=ListCardReadyPreload
app.locals.data =ListCardReady;//makes global varianle wich can be updated and accessed in all scopes//required for updating/randomizing from post scope -> get
let selectedCard:number=0;//for calculation



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
        selectedDeck,
        selectedCard
        
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
        selectedDeck,
        selectedCard      
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
            selectedDeck,
            
            selectedCard
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
        selectedDeck,
        
        selectedCard
    });
    }
    if(buttonType=='calculate'){
        let ListCardReady=await app.locals.data;
        
        let selectMenuThing= req.body;//find value
        var selectedValue = selectMenuThing[Object.keys(selectMenuThing)[0]];//this gives selected value

        selectedCard=selectedValue;

    res.render("drawtest",{

        title: "Drawtest",
        ListCardReady,
        drawnCards,
        selectedDeck ,
        selectedCard
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

app.listen (app.get("port"), async() => {
    console.log("[server] http://localhost:" + app.get("port"));
    await connect();
});



