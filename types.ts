import { ObjectId } from "mongodb";

export interface Variation{
    id:     string, // scryfall ID
    count:  number
}
export interface CardS {   // kleine samenvatting
    id:         string, // Oracle ID
    variations: Variation[],
    mana:       string[],
    manacost:   number,
    isLand:     boolean
}
export interface Deck{
    _id?: ObjectId,
    id: number,
    name: string,
    cards?: CardS[],
    coverCard: string|null, //cardID???
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

    type_line:         string,
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
    multiverse_ids:    string[];
    cmc:               number,
}
export interface ImageUris {
    small:       string;
    normal:      string;
    large:       string;
    png:         string;
    art_crop:    string;
    border_crop: string;
}
export interface Set {
    object:      string;
    total_cards: number;
    has_more:    boolean;
    data:        Card[];
}