import {MetaphoricalSense} from "./metaphorical_sense.js";

export class MixedMetaphoricalSense extends MetaphoricalSense {

    // Adds handling of mixed remerging/splitting

    constructor(sense) {
        console.log('Creating mixed metaphorical sense')
        super(sense);
        this.definition = this.definition.copy()
        this.build_cells() // Needed to get new references
        this.resembles = this.new_sense_id + 'L'

    }

    embed(position) {
        this.new_sense_id += 'M'
        super.embed(position)
    }

    embed_with_removal(sense) {
        // Do nothing - handled by lit sese
    }

    remove() {
        console.error('This should never be called - it is handled by the literal sense')
    }

    fill_label_cell() {
        this.label_selector_cell.innerHTML = 'Metaphorical'
    }

    fill_row() {
        // skip tool cell
        this.row.innerHTML = ''
        this.row.appendChild(this.name_cell)
        this.row.appendChild(this.definition.definition_cell)
        //this.row.appendChild(this.definition.image_cell)
        this.row.appendChild(this.label_selector_cell)
        this.row.appendChild(this.relation_cell)
        this.row.appendChild(this.feature_cell)
    }

    get_data() {
        let data = super.get_data();
        data['Label'] = 'Mixed'
        return data
    }
}