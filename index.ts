import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.set("port", 3000);
app.set("view engine", "ejs");
app.use(express.static("public"));

// Om uit body te lezen (voor post)
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));

let pics = [{name: '', img: '', rarity: ''}];

app.get("/home", (req, res) => {
    res.render("homepage");
});

interface Card {
    name: string,
    img: string,
    rarity: string
}



app.post("/home", async (req, res) => {

    try{
        let text = req.body.search; 
        console.log(text);
        let response = await fetch(`https://api.scryfall.com/cards/search?q=lore=${text}`); // Lore zoekt overal op kaart
        let cards = await response.json();
        //console.log(cards);

        if(cards.object != "error"){
            pics = [{name: '', img: '', rarity: ''}];
            let total_cards = cards.total_cards;
            //console.log(total_cards);
            let maxCardsPerPage = 175; // request limit per pagina van scryfall
            if(total_cards > maxCardsPerPage)
            {        
                total_cards = maxCardsPerPage;
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
            
                    
                
            console.table(pics, ["name", "rarity"]);
            return res.render("homepage", {pics});

        }

        else{
            return res.render("homepage", {error: "error"});
        }
    }

    catch(e:any){
        console.log(e);
    }
    
});

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);