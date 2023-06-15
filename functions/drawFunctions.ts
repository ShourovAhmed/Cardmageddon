import { ListReadyDecksInterface, simpleCardObject, CardS, Deck } from "../types";
import { client } from "../staticValues";


export const shuffleArray = (array:any) => {
    // create a copy of the array so that the original array is not mutated
    
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

const getCardFromApi= async (cardsid:string ) => {

    //gets card object from id to api call
        let id= cardsid;
        let response = await fetch(`https://api.scryfall.com/cards/${id}`); 
        //let cardFromApi: string[]=[];//old
        let cardFromApi=[];
        cardFromApi = await response.json();
        
        
        return cardFromApi;       
    }
const makeCardListFromApi =async(cardsIds:string[],simpleCard:simpleCardObject[]) => {
    
    
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
    
    
const makeIdList=(cards:CardS[],cardsIds:string[]) => {
    
        //get array only containing varIds// needed for api
    
        for(let i=0;i<cards.length;i++){
            if(cards[i].variations[0].count>1){
                for(let c=0;c<cards[i].variations[0].count;c++){
                    
                    let card=cards[i].variations[0];
                    cardsIds.push(card.id);
                }
    
            }else{
    
            let card=cards[i].variations[0];
            cardsIds.push(card.id);
            }
        
    
        }
        //console.log(`copyArray: ${cardToIds}`);
        return cardsIds;
    
    }
    

const LoadingAllDecks = async () => {//will do as before but load all decks so cards wil be one space deeper inside the array
    
    try{
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

export const iHatePromises =async () => {
    let ListCardReadyPreload=await LoadingAllDecks();
    return ListCardReadyPreload;

}