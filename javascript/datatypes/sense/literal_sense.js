import {Sense} from "./sense.js";

export class LiteralSense extends Sense {

    // Handles extra info of literals (root, related to)
    constructor(sense) {
        super(sense);
        this.label = 'Literal'
        this.insane = true
    }

    set_colour() {
        this.row.style.backgroundColor = '#FFF3D9'
    }

    fill_relation_cell() {
        this.relation_cell.innerHTML = 'N/A'
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['features'] = this.get_features()
        return sense_data
    }
}