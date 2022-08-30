import {LiteralSense} from "./literal_sense.js";
import {MixedMetaphoricalSense} from "../metaphorical/mixed_metaphorical_sense.js";

export class MixedLiteralSense extends LiteralSense {

    // Adds handling of mixed remerging/splitting

    constructor(sense) {
        console.log('Creating mixed literal sense')
        super(sense);
        this.base_sense = sense

        // Insert the metaphorical half as well
        let met_half = new MixedMetaphoricalSense(this.base_sense)
        met_half.embed(this.lemma.new_id_order.indexOf(this.new_sense_id) + 1)
    }

    embed(position) {
        this.new_sense_id += 'L'
        super.embed(position)
    }

    remove() {
        // Remove it and the met mixed
        const position = this.lemma.new_id_order.indexOf(this.new_sense_id)
        this.lemma.new_id_to_sense.delete(this.base_sense.new_sense_id+'L')
        this.lemma.new_id_to_sense.delete(this.base_sense.new_sense_id+'M')
        this.lemma.new_id_order.splice(position, 2)
        return position
    }

    fill_tool_cell() {
        let that = this
        this.tool_cell.innerHTML = ''
        this.tool_cell.rowSpan="2"
        this.tool_cell.style.backgroundColor='white'
        this.tool_cell.style.textAlign = 'center'

        let remerge_button = document.createElement("button")
        remerge_button.type = 'button'
        remerge_button.onclick = function () {
            that.lemma.screen.logs.log(`remerge`, that.backend_sense_id, ``)
            that.lemma.merge_mixed_sense(that.new_sense_id)
        }
        remerge_button.innerHTML = '<nobr>Re-merge</nobr>'
        this.tool_cell.appendChild(remerge_button)
    }

    fill_label_cell() {
        this.label_selector_cell.innerHTML = 'Literal'
    }

    get_data() {
        let data = super.get_data();
        data['Label'] = 'Mixed'
        return data
    }
}