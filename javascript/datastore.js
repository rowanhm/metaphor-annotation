import {load_json} from "./io.js";

export class Datastore {

    constructor() {
    }

    async load() {
        this.concepts_to_definitions = await load_json("data/extracted/concepts_to_definitions.json");
        this.concepts_to_img_flags = await load_json("data/extracted/concepts_to_images.json");
        this.lemmas_to_senses = await load_json("data/extracted/lemmas_to_senses.json");
        this.senses_to_info = await load_json("data/extracted/senses_to_info.json");
    }

}