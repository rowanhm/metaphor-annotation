import {make_empty_cell} from "../../utilities.js";
import {WordNetDefinition} from "../definition/wordnet_definition.js";
import {CustomDefinition} from "../definition/custom_definition.js";

export class Sense {

    constructor(sense) {
        this.insane = true

        if (sense !== null) {
            this.lemma = sense.lemma
            this.known = sense.known
            this.new_sense_id = sense.new_sense_id
            this.name_cell = sense.name_cell
            this.label_selector_cell = sense.label_selector_cell
            this.relation_cell = sense.relation_cell
            this.tool_cell = sense.tool_cell
            this.row = sense.row
            this.definition = sense.definition
            this.backend_sense_id = sense.backend_sense_id
            this.feature_cell = sense.feature_cell
            this.definition.sense = this
            this.label_options = sense.label_options
            this.is_mixed = sense.is_mixed
            this.is_ghost = sense.is_ghost
        }

        this.label = null
        this.border_pattern = '1px solid black'
    }

    is_stable() {
        if (!this.definition.is_stable()) {
            return false
        }
        if (this.get_label() === null) {
            return false
        }
        return true
    }

    get_label() {
        return this.label
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
        this.row.style.borderTop = this.border_pattern
        this.name_cell = make_empty_cell()
        this.name_cell.style.textAlign = 'center'
        this.tool_cell = make_empty_cell()
        this.tool_cell.style.backgroundColor='white'
        this.tool_cell.style.textAlign = 'center'
        this.label_selector_cell = make_empty_cell()
        this.relation_cell = make_empty_cell()
        this.feature_cell = make_empty_cell()
        this.feature_cell.style.textAlign = 'right'
        this.definition.make_definition_cell()
        // this.definition.make_image_cell()
        this.make_row()
    }

    initialise_wordnet_sense(lemma, wordnet_sense_id, new_sense_id) {
        this.lemma = lemma
        this.backend_sense_id = `wordnet:${wordnet_sense_id}`
        this.new_sense_id = new_sense_id
        this.definition = new WordNetDefinition(lemma, wordnet_sense_id)
        this.is_mixed = false
        this.is_ghost = false
        this.known = true
        // Only literal half will be created this ways -- other initialised as met
        this.label_options = ['Literal', 'Related', 'Metaphorical']
        this.build_cells()
    }

    initialise_custom_sense(lemma, new_sense_id) {
        this.lemma = lemma
        this.backend_sense_id = `new:${this.lemma.get_next_new_sense_id()}`
        this.new_sense_id = new_sense_id
        this.definition = new CustomDefinition(this)
        this.label_options = ['Literal' , 'Related']
        this.is_mixed = false
        this.is_ghost = true
        this.known = true
        this.build_cells()
    }

    get_row() {
        this.make_row()
        return this.row
    }

    get_outward_facing_id() {
        if (this.backend_sense_id.substring(0, 8) === 'wordnet:') {
            return `${this.lemma.datastore.senses_to_info[this.backend_sense_id.substring(8)]['word']}(${this.new_sense_id})`
        } else {
            return `${this.lemma.word}(${this.new_sense_id})`
        }
    }

    fill_name_cell() {
        this.name_cell.innerHTML = '<b>' + this.get_outward_facing_id() + '</b><br>'
        if (this.is_stable()) {
            this.name_cell.style.color = 'green'
        } else {
            this.name_cell.style.color = 'red'
        }

        let known = document.createElement('nobr')
        known.style.fontSize = '80%'
        known.innerHTML = 'known? '
        let checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        if (this.known) {
            checkbox.checked = true
        }
        known.appendChild(checkbox)
        known.style.color = 'grey'
        let that = this
        known.onclick = function () {
            that.known = !that.known
            that.lemma.update_word_known()
        }
        this.name_cell.appendChild(known)
    }

    fill_tool_cell() {
        let that = this
        this.tool_cell.innerHTML = ''
        this.tool_cell.style.backgroundColor='white'
        this.tool_cell.style.textAlign = 'center'

        if (this.is_ghost) { // Delete button
            let delete_button = document.createElement("button")
            delete_button.type = 'button'
            delete_button.onclick = function () {
                that.lemma.screen.logs.log(`delete_ghost_sense`, that.backend_sense_id, ``)
                that.lemma.delete_ghost_sense(that.new_sense_id)
            }
            delete_button.innerHTML = 'Delete'
            this.tool_cell.appendChild(delete_button)

        } else {

            if (!this.is_mixed) { // Split button
                let split_button = document.createElement("button")
                split_button.type = 'button'
                split_button.onclick = function () {
                    that.lemma.screen.logs.log(`split`, that.backend_sense_id, ``)
                    that.lemma.split_mixed_sense(that.new_sense_id)
                }
                split_button.innerHTML = 'Split'
                this.tool_cell.appendChild(split_button)

            } else { // Merge button
                if (this.get_label() !== 'Metaphorical') {
                    this.tool_cell.rowSpan = "2"

                    let remerge_button = document.createElement("button")
                    remerge_button.type = 'button'
                    remerge_button.onclick = function () {
                        that.lemma.screen.logs.log(`remerge`, that.backend_sense_id, ``)
                        that.lemma.merge_mixed_sense(that.new_sense_id)
                    }
                    remerge_button.innerHTML = '<nobr>Re-merge</nobr>'
                    this.tool_cell.appendChild(remerge_button)
                }
            }
        }
    }

    fill_label_cell() {
        if (this.label_options.length > 1) {
            let that = this
            this.label_selector_cell.innerHTML = ''
            const select_name = `${this.new_sense_id}:label_assign`
            for (const option of this.label_options) {
                let no_break = document.createElement('nobr')
                const name = `${this.new_sense_id}:label_assign:${option}`

                let input = document.createElement("input");
                input.type = "radio"
                input.name = select_name
                input.id = name
                input.onclick = function () {
                    that.lemma.screen.logs.log(option.toLowerCase(), that.backend_sense_id, '')
                    that.lemma.set_label(that.new_sense_id, option.toLowerCase())
                }
                no_break.appendChild(input)

                let label = document.createElement("label");
                label.htmlFor = name
                label.innerHTML += option

                if (option === this.get_label()) {
                    input.checked = true
                }

                no_break.appendChild(label)

                no_break.appendChild(document.createElement("br"))
                this.label_selector_cell.appendChild(no_break)
            }
        } else {
            this.label_selector_cell.innerHTML = this.label_options[0]
        }
    }

    fill_relation_cell() {
        this.relation_cell.innerHTML = ''
    }

    fill_features_cell() {
        this.feature_cell.innerHTML = ''
    }

    make_row() {
        // Fill all cells
        this.fill_name_cell()
        this.fill_label_cell()
        this.fill_relation_cell()
        this.fill_features_cell()
        this.fill_tool_cell()

        // Attach all cells
        this.fill_row()
        this.set_colour()

    }

    fill_row() {
        this.row.innerHTML = ''
        this.row.appendChild(this.name_cell)
        this.row.appendChild(this.definition.definition_cell)
        // this.row.appendChild(this.definition.image_cell)
        this.row.appendChild(this.label_selector_cell)
        this.row.appendChild(this.relation_cell)
        this.row.appendChild(this.feature_cell)
        if ((!this.is_mixed) || (this.is_mixed && (this.get_label() !== 'Metaphorical'))) {
            // Don't add the tool cell for mixed metaphorical senses
            this.row.appendChild(this.tool_cell)
        }
    }

    set_colour() {
        this.row.style.backgroundColor = '#FFFFFF'
    }

    get_data() {
        let sense_data = {}
        sense_data['known'] = this.known
        sense_data['mixed'] = this.is_mixed
        sense_data['ghost'] = this.is_ghost
        sense_data['label'] = this.get_label()
        if (this.definition instanceof CustomDefinition) {
            sense_data['definition'] = this.definition.get_definition()
        }
        return sense_data
    }

    make_definition_cell(){
        this.definition_cell = this.definition.make_definition_cell()
    }

    make_image_cell(){
        this.image_cell = this.definition.make_image_cell()
    }
}