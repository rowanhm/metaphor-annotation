import {LiteralSense} from "./literal_sense.js";
import {Sense} from "../sense.js";

export class GhostLiteralSense extends LiteralSense {

    // Adds definition setting, deleting

    constructor(lemma, new_sense_id) {
        // Make a stub sense and call super on it
        const blank_sense = new Sense(null)
        blank_sense.initialise_custom_sense(lemma, new_sense_id)
        super(blank_sense);
    }

    fill_name_cell() {
        super.fill_name_cell();
        this.name_cell.innerHTML += '&#128123;'
    }

    fill_tool_cell() {
        let that = this
        this.tool_cell.innerHTML = ''
        this.tool_cell.style.backgroundColor='white'
        this.tool_cell.style.textAlign = 'center'

        let delete_button = document.createElement("button")
        delete_button.type = 'button'
        delete_button.onclick = function () { that.lemma.delete_ghost_sense(that.new_sense_id) }
        delete_button.innerHTML = 'Delete'
        this.tool_cell.appendChild(delete_button)
    }

    fill_label_cell() {
        this.label_selector_cell.innerHTML = 'Literal'
    }

    is_stable() {
        super.is_stable()
        const defn = this.definition.get_definition()
        if (defn.length === 0) {
            return false
        }
        return true
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['definition'] = this.definition.get_definition()
        return sense_data
    }

}