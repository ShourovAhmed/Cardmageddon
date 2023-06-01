import express from 'express';
import fetch from 'node-fetch';
import {MongoClient} from 'mongodb';
import {Deck, CardS, Info, UserInfo} from "./types";
import { render } from 'ejs';
import { getFreeId, getCard, cardToCardS, getDeckImages, getDeck, addOrRemoveCard, deckAccess} from './functions';
import { maxNonLandCardcount, maxTotalCardsInDeck } from './staticValues';
import { log } from 'console';
import { title } from 'process';


//EXPRESS
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



export let myDecks : number[];
let pics = [{name: '', img: '', rarity: ''}];
export let userInfo : UserInfo = {
    userName: "",
    id: 1,
    decks: [],
}

app.get("/", (req, res) =>{
    res.render("landingPage");
})

app.get("/home", (req, res) => {  

    // Paging
    const cardsPerPage = 10;
    const pageNumber: number = parseInt(req.query.page as string) || 1;
  
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
            pics = [{name: '', img: '', rarity: ''}];
            let total_cards = cards.total_cards;
            let maxCardsPerRequest = 175; // request limit per pagina van scryfall
            if(total_cards > maxCardsPerRequest)
            {        
                total_cards = maxCardsPerRequest;
            }
            for (let i = 0; i < total_cards; i++){
                if(cards.data[i].card_faces){
                    for(let j = 0; j < cards.data[i].card_faces.length; j++){
                        if(cards.data[i].card_faces[j].image_uris){ // Sommige kaarten hebben enkel 1 image, in de main card object. sommige verschillende imgs in de card_faces objecten
                            pics[i] = { 
                                name: cards.data[i].name,
                                img: cards.data[i].card_faces[j].image_uris.normal,
                                rarity: cards.data[i].rarity
                            };
                        }

                        else{
                            pics[i] = {
                                name: cards.data[i].name,
                                img: cards.data[i].image_uris.normal,
                                rarity: cards.data[i].rarity
                            };
                        }
                    }
                    
                }

                else{
                    pics[i] = {
                        name: cards.data[i].name,
                        img: cards.data[i].image_uris.normal,
                        rarity: cards.data[i].rarity
                    };
                }
                    
            }
            
            // Paging
            const cardsPerPage: number = 10;
            const pageNumber: number = parseInt(req.query.page as string) || 1;
        
            const startIdx = (pageNumber - 1) * cardsPerPage;
            const endIdx = startIdx + cardsPerPage;
            const shownCards = pics.slice(startIdx, endIdx);
        
            const totalPages = Math.ceil(pics.length / cardsPerPage);
            console.log("Sliced");
            console.table(shownCards);
                    
                
            console.table(pics, ["name", "rarity"]);
            return res.render("homepage", {
                cards: shownCards,
                pageNumber,
                totalPages
            });

        }            
        


        else{
            return res.render("homepage", {error: "error"});
        }
    }

    catch(e:any){
        console.log(e);
    }
    
});



app.get("/decks", async(req,res) =>{
    let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
    
    res.render("decks", {title: "Decks", decks: decks});
});

app.post("/decks", async (req,res) =>{
    let newDeckName : string = req.body.deckName;

    let newDeck : Deck = {
        id: await getFreeId(),
        name: req.body.deckName, 
        coverCard: null,
        cards: [],
        ownerID: userInfo.id
    }
    try{
        db.collection("decks").insertOne(newDeck);
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
        let info : Info = new Info(true, `Deck: "${newDeckName}" Toegevoegd`);
        res.render("decks", {title: "Decks", decks: decks, info: info});
    }
    catch(e: any){
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();
        let info : Info = new Info(false, `Toevoegen mislukt`)
        res.render("decks", {title: "Decks", decks: decks, info: info});
    }
});
// DECKOPTIONS
app.post("/deck", async (req,res) =>{
let deckId : number = parseInt(req.body.deckId);
if(deckId - parseFloat(req.body.deckId) != 0){
    // res.render("decks", {title: "Decks", decks: await getDecks(), info: new Info(false, "Foutief Deck ID")});
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
//update deck name
app.post("/deck/:deckId", async(req,res)=>{
    if(req.body.removeDeck){
        await db.collection("decks").deleteOne({id: parseInt(req.params.deckId)});
        res.redirect("/decks");
    }
    else{
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

app.get("/deck/:id", async(req,res) =>{
    let info : Info = new Info(false, "Er ging iets mis");
    
    let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});
    if (!deck){
        console.log(`Ongeldig Deck ID: ${req.params.id}`);
        res.render('decks', {title: "Decks", info: new Info(false, "Ongeldig Deck ID")});
    }
    else{
        res.render('deck', {title: "Deck", deck: deck});
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