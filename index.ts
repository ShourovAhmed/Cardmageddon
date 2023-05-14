import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.set("port", 3000);
app.set("view engine", "ejs");
app.use(express.static("public"));

// Om uit body te lezen (voor post)
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));

app.get("/home", (req, res) => {
    res.render("homepage");
});


let pics = [{name: '', img: '', rarity: ''}];
app.post("/home", async (req, res) => {

    try
    {let text = req.body.search; console.log(text);
    let response = await fetch(`https://api.scryfall.com/cards/search?q=${text}`);
    let cards = await response.json();

    if(cards.object != "error"){
        pics = [{name: '', img: '', rarity: ''}];
        let total_cards = cards.total_cards;
        if(total_cards > 40)
        {        
            total_cards = 40;
        }
        for (let i = 0; i < total_cards; i++){
            if(cards.data[i].card_faces){
                for(let j = 0; j < cards.data[i].card_faces.length; j++){
                    pics.push({
                        name: cards.data[i].name,
                        img: cards.data[i].card_faces[j].image_uris.border_crop,
                        rarity: cards.data[i].card_faces[j].rarity
                    });
                }
                
            }
            else{
                pics.push({
                    name: cards.data[i].name,
                    img: cards.data[i].image_uris.border_crop,
                    rarity: cards.data[i].rarity
                });
            }
                
        }
        console.table(pics);
        //console.log(x.data[0].name);
        return res.render("homepage", {pics});
    }

    else{
        return res.render("homepage", {error: "error"});
    }}
    catch(e:any){
        console.log(e);
    }
    finally{
        res.render("homepage");
    }
    
});

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);