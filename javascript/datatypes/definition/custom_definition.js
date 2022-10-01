import {make_empty_cell} from "../../utilities.js";

export class CustomDefinition {

    constructor(sense) {
        this.sense = sense
    }

    make_definition_cell() {
        this.definition_cell = make_empty_cell()
        this.definition = document.createElement('textarea')
        this.definition_cell.appendChild(this.definition)
        let that = this
        this.definition.oninput = function() {
            that.sense.fill_name_cell()
        }
    }

    get_definition() {
        return this.definition.value
    }

    make_image_cell() {
        this.image_cell = make_empty_cell()
    }

    is_stable() {
        const defn = this.get_definition()
        if (defn.length === 0) {
            return false
        }
        return true
    }
}