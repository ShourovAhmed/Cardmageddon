import { ObjectId } from "mongodb";

export enum CardType{
    "Land","Creature","Artifact","Enchantment","Planeswalker","Instant","Sorcery"
}

export interface CardS {   // kleine samenvatting
    _id?:       ObjectId,
    id:         string,
    count:      number,
    type:       CardType
}
export interface Deck{
    _id?:       ObjectId,
    id:         number,
    name:       string,
    cards?:     CardS,  //dard_id array
    coverCard?: string  //cardID
}

export interface Card {    // Om kaarten binne te lezen uit de API
    object:            string,
    id:                string,
    oracle_id:         string,


    name:              string,
    lang:              string,
    released_at:       Date,

    layout:            string,

    image_uris:        ImageUris,

    mana_cost:         string,

    type_line:         CardType,
    oracle_text:       string,

    colors:            string[],
    color_identity:    string[],
    produced_mana:     string[],

    games:             string[],
    set_id:            string,
    set:               string,
    set_name:          string,
    set_type:          string,
    set_uri:           string,
    scryfall_set_uri:  string,
    collector_number:  string,
    rarity:            string,
    flavor_text:       string,
    artist:            string
}
export interface ImageUris {
    small:       string,
    normal:      string,
    large:       string,
    art_crop:    string
}