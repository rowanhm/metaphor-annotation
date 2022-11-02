import {make_empty_cell} from "../../utilities.js";
import {Issues} from "../issues.js";

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

    issues() {
        let issues = new Issues()
        const defn = this.get_definition()
        if (defn.length === 0) {
            issues.add_issue(`${this.sense.get_outward_facing_id()} does not have a definition.`)
        }
        return issues
    }
}