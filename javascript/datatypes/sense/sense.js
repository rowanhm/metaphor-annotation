import {make_empty_cell} from "../../utilities.js";
import {WordNetDefinition} from "../definition/wordnet_definition.js";
import {CustomDefinition} from "../definition/custom_definition.js";

export class Sense {

    constructor(sense) {
        this.insane = true

        if (sense !== null) {
            this.lemma = sense.lemma
            this.new_sense_id = sense.new_sense_id
            this.name_cell = sense.name_cell
            this.definition_cell = sense.definition_cell
            this.image_cell = sense.image_cell
            this.label_selector_cell = sense.label_selector_cell
            this.info_cell = sense.info_cell
            this.tool_cell = sense.tool_cell
            this.row = sense.row
            this.definition = sense.definition

            // Embed
            this.embed_with_removal(sense)
        }
    }

    get_label() {
        return null
    }

    remove() {
        const position = this.lemma.new_id_order.indexOf(this.new_sense_id)
        this.lemma.new_id_to_sense.delete(this.new_sense_id)
        this.lemma.new_id_order.splice(position, 1)
        return position
    }

    embed_with_removal(sense) {
        const insert_position = sense.remove()
        this.embed(insert_position)
    }

    embed(insert_position) {
        if (insert_position === -1) {
            console.error('Inserting a sense to invalid position')
        }
        this.lemma.new_id_to_sense.set(this.new_sense_id, this)
        this.lemma.new_id_order.splice(insert_position, 0, this.new_sense_id)
    }

    mark_insane() {
        this.insane = true
    }

    sanify() {
        if (this.insane) {
            this.insane = false
        }
    }

    build_cells() {
        this.row = document.createElement("tr");
        this.row.style.borderTop = '1px solid black'
        this.name_cell = make_empty_cell()
        this.name_cell.style.textAlign = 'center'
        this.tool_cell = make_empty_cell()
        this.tool_cell.style.backgroundColor='white'
        this.tool_cell.style.textAlign = 'center'
        this.label_selector_cell = make_empty_cell()
        this.info_cell = make_empty_cell()
        this.make_row()
    }

    initialise_wordnet_sense(lemma, wordnet_sense_id, new_sense_id) {

        this.lemma = lemma
        this.new_sense_id = new_sense_id
        this.definition = new WordNetDefinition(lemma, wordnet_sense_id)

        this.build_cells()
        this.embed(lemma.new_id_order.length)
    }

    initialise_custom_sense(lemma, new_sense_id) {
        this.lemma = lemma
        this.new_sense_id = new_sense_id
        this.definition = new CustomDefinition()

        this.build_cells()
        this.embed(lemma.new_id_order.length)
    }

    get_row() {
        this.make_row()
        return this.row
    }

    get_outward_facing_id() {
        return `${this.lemma.word}(${this.new_sense_id})`
    }

    fill_name_cell() {
        this.name_cell.innerHTML = '<b>' + this.get_outward_facing_id() + '</b><br>'
    }

    fill_tool_cell() {
        let that = this
        this.tool_cell.innerHTML = ''
        let split_button = document.createElement("button")
        split_button.type = 'button'
        split_button.onclick = function () { that.lemma.split_mixed_sense(that.new_sense_id) }
        split_button.innerHTML = 'Split'
        this.tool_cell.appendChild(split_button)
    }

    fill_label_cell() {
        let that = this
        this.label_selector_cell.innerHTML = ''
        const select_name = `${this.new_sense_id}:label_assign`
        for (const option of ['Literal', 'Metaphorical']) {
            let no_break = document.createElement('nobr')
            const name = `${this.new_sense_id}:label_assign:${option}`

            let input = document.createElement("input");
            input.type = "radio"
            input.name = select_name
            input.id = name
            input.onclick = function () {
                that.lemma.set_label(that.new_sense_id, option.toLowerCase())
            }
            no_break.appendChild(input)

            let label = document.createElement("label");
            label.htmlFor = name
            label.innerHTML += option

            if (option === this.get_label()){
                input.checked = true
            }

            no_break.appendChild(label)

            no_break.appendChild(document.createElement("br"))
            this.label_selector_cell.appendChild(no_break)
        }
    }

    fill_info_cell() {
        this.info_cell.innerHTML = ''
    }

    make_row() {
        // Fill all cells
        this.fill_name_cell()
        this.make_definition_cell()
        this.make_image_cell()
        this.fill_name_cell()
        this.fill_label_cell()
        this.fill_info_cell()
        this.fill_tool_cell()

        // Attach all cells
        this.fill_row()
        this.set_colour()

    }

    fill_row() {
        this.row.innerHTML = ''
        this.row.appendChild(this.name_cell)
        this.row.appendChild(this.definition_cell)
        this.row.appendChild(this.image_cell)
        this.row.appendChild(this.label_selector_cell)
        this.row.appendChild(this.info_cell)
        this.row.appendChild(this.tool_cell)
    }

    set_colour() {
        this.row.style.backgroundColor = '#FFFFFF'
    }

    make_definition_cell(){
        this.definition_cell = this.definition.make_definition_cell()
    }

    make_image_cell(){
        this.image_cell = this.definition.make_image_cell()
    }


}