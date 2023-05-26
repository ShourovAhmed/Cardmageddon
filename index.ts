import express from 'express';
import fetch from 'node-fetch';
import {MongoClient} from 'mongodb';
import {Deck} from "./types";
import { render } from 'ejs';
import { getFreeId } from './functions';
import { log } from 'console';


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


let pics = [{name: '', img: '', rarity: ''}];

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
    let newDeck : Deck|any = {
        id: await getFreeId(),
        name: req.body.deckName,
        coverCard: null,
    }
    try{
        db.collection("decks").insertOne(newDeck);
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();

        res.render("decks", {title: "Decks", decks: decks, info: `Deck: "${newDeckName}" Toegevoegd`});
    }
    catch(e: any){
        let decks : Deck[]|null = await db.collection('decks').find<Deck>({}).toArray();

        res.render("decks", {title: "Decks", decks: decks, info: `Toevoegen mislukt`});
    }
});



app.get("/deck/:id", async(req,res) =>{
    
    let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});

    if (!deck){
        console.log("fout");
        console.log(`Ongeldig Deck ID: ${req.params.id}`);
        res.redirect('/404');
    }
    else{
        res.render('deck', {title: "Deck", deck: deck});
    }
});

app.post("/deck/:deckId", async(req,res)=>{
    await db.collection("decks").updateOne({id: parseInt(req.params.deckId)},{$set:{name: req.body.deckName}});
    res.redirect(`/deck/${req.params.deckId}`);
});

app.get("/deckImage/:id", async(req,res) =>{
    
    let deck : Deck|null = await db.collection('decks').findOne<Deck>({id: parseInt(req.params.id)});

    if (!deck){
        console.log("fout");
        console.log(`Ongeldig Deck ID: ${req.params.id}`);
        res.redirect('/404');
    }
    else{
        res.render('deck-image', {title: "Deck", deck: deck});
    }
});
app.post("/deckImage/:deckId", async(req,res) =>{
    if(req.body.next){

    }
    else if(req.body.previous){
        res.render("")
    }
});



app.get("/cardDetails/:id", async(req,res) =>{
    console.log(req.params.id);
    res.redirect("/404");
});
app.get("/drawtest/:deckId", async(req,res) => {
    res.redirect("/404");
});

app.use((req, res) => {
    res.status(404);
    res.render("bad-request", {title: "404"});
    }
  );

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);