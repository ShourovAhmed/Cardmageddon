import express from 'express';
import fetch from 'node-fetch';
import {MongoClient} from 'mongodb';
import {Deck} from "./types";


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
const db = client.db("userData");


let pics = [{name: '', img: '', rarity: '', id: ''}];
let pageNumber: number = 0;



app.get("/", (req, res) =>{
    res.render("landingPage");
})

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
            pics = [{name: '', img: '', rarity: '', id: ''}];
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
                                rarity: cards.data[i].rarity,
                                id: cards.data[i].id
                            };
                        }

                        else{
                            pics[i] = {
                                name: cards.data[i].name,
                                img: cards.data[i].image_uris.normal,
                                rarity: cards.data[i].rarity,
                                id: cards.data[i].id
                            };
                        }
                    }
                    
                }

                else{
                    pics[i] = {
                        name: cards.data[i].name,
                        img: cards.data[i].image_uris.normal,
                        rarity: cards.data[i].rarity,
                        id: cards.data[i].id
                    };
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

// app.get("/cardDetail/:id", (req, res) => {

//     res.render("cardDetail"); 
    
    
// });

app.get("/cardDetail/:id", async (req, res) => {

    let id: number = parseInt(req.params.id);
    if(pageNumber > 1){
        id += (pageNumber - 1) * 10;
    }
    // console.log("page: " + pageNumber);
    // console.log("id: " + id);

    let response = await fetch(`https://api.scryfall.com/cards/${pics[id].id}`);
    let fullCard: any = await response.json();

    //console.log(fullCard);
    let cardManaCost = splitMana(fullCard.mana_cost); //TODO dubbelzijdige hebben mana cost in card_faces
    let cardText: string[] = fullCard.oracle_text.split("\n");
    let cardRarity = fullCard.rarity.charAt(0).toUpperCase() + fullCard.rarity.slice(1);
    
    console.log(cardText);

    let card = {
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

    res.render("cardDetail", {card: card, localCard: pics[id]});

    
});


app.get("/decks", (req,res) =>{


    res.render("decks", {title: "Decks"});
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

// app.use((req, res) => {
//     res.status(404);
//     res.render("bad-request", {title: "404"});
//     }
//   );

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);

const splitMana = (mana: string) => {
    let splitted = mana.split(/[{}]/g).filter(item => item !== ''); // doet de '{' en '}' symbolen weg en filtert dan ook de lege plekken uit de array
    //TODO ook de half mana symbolen toevoegen bv B/R
    
    return splitted;
}