import {make_empty_cell} from "../../utilities.js";

export class CustomDefinition {

    constructor() {
    }

    make_definition_cell() {
        let definition_cell = make_empty_cell()
        let text_area = document.createElement('textarea')
        definition_cell.appendChild(text_area)
        return definition_cell
    }

    make_image_cell() {
        let image_cell = make_empty_cell()
        return image_cell
    }
}