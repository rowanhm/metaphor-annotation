import {Sense} from "./sense.js";
import {autocomplete} from "../../autocompletion.js";
import {is_valid_feature} from "../../utilities.js";

export class LiteralSense extends Sense {

    // Handles extra info of literals (root, related to)
    constructor(sense) {
        super(sense);
        if (!(sense instanceof LiteralSense)) {
            console.log('Initialising features')
            this.features_inputs = {}
            this.features_index = 0
        } else {
            this.features_inputs = sense.features_inputs
            this.features_index = sense.features_index
        }
        this.label = 'Literal'
        this.insane = true
    }

    add_feature() {
        let new_feature = document.createElement('input')
        new_feature.type = 'text'
        let that = this
        new_feature.oninput = function () {
            that.refresh_text()
            for (const metaphor of that.lemma.metaphorical_senses()) {
                if (metaphor.get_resembles() === that.new_sense_id) {
                    metaphor.fill_name_cell()
                }
            }
        }
        this.features_inputs[this.features_index] = new_feature
        this.features_index++
        this.insane = true
        this.lemma.refresh()
        autocomplete(new_feature, this.lemma.datastore.feature_list)
    }

    delete_feature(feature_id) {
        delete this.features_inputs[feature_id]
        this.insane = true
        for (const sense of this.lemma.metaphorical_senses()) {
            sense.insane = true
        }
        this.lemma.refresh()
    }

    get_features() {
        this.sanify()
        let features = {}
        for (const [feature_id, feature_input] of Object.entries(this.features_inputs)) {
            features[feature_id] = feature_input.value
        }
        return features
    }

    get_feature(feature_id) {
        this.sanify()
        return this.features_inputs[feature_id].value
    }

    get_feature_inputs() {
        this.sanify()
        return this.features_inputs
    }

    sanify() {
        if (this.insane) {
            this.insane = false
        }
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

    fill_features_cell() {
        this.feature_cell.innerHTML = ''

        let that = this
        const features = this.get_feature_inputs()
        let subtable = document.createElement('table')
        for (const [feature_id, feature_input] of Object.entries(features)) {
            let row = document.createElement('tr')

            let feature_cell = document.createElement('td')
            feature_cell.style.textAlign = 'left'

            row.appendChild(feature_cell)
            let no_break = document.createElement('nobr')
            no_break.innerHTML = 'This thing '
            let new_feature_wrapper = document.createElement('div')
            new_feature_wrapper.className = 'autocomplete'
            new_feature_wrapper.appendChild(feature_input)
            no_break.appendChild(new_feature_wrapper)
            feature_cell.appendChild(no_break)

            let delete_cell = document.createElement('td')
            row.appendChild(delete_cell)
            let delete_button = document.createElement("button")
            delete_button.type = 'button'
            delete_button.onclick = function () {
                that.lemma.screen.logs.log('delete_feature', that.backend_sense_id, `feature_${feature_id}`)
                that.delete_feature(feature_id)
            }
            delete_button.innerHTML = 'Delete'
            delete_cell.appendChild(delete_button)
            delete_cell.style.textAlign = 'right'

            subtable.appendChild(row)
        }

        // Add 'add' button
        let add_row = document.createElement('tr')
        let add_cell = document.createElement('td')
        add_cell.colSpan = '2'
        add_cell.style.textAlign = 'right'
        let create_button = document.createElement("button")
        create_button.type = 'button'
        create_button.onclick = function () {
            that.lemma.screen.logs.log('new_feature', that.backend_sense_id, '')
            that.add_feature()
        }
        create_button.innerHTML = 'Add'
        add_row.appendChild(add_cell)
        add_cell.appendChild(create_button)
        subtable.appendChild(add_cell)

        this.feature_cell.appendChild(subtable)

    }

    refresh_text() {
        for (const metaphorical_sense of this.lemma.metaphorical_senses()) {
            metaphorical_sense.fill_features_cell()
        }
        this.fill_name_cell()
    }

    is_stable() {
        if (!super.is_stable()) {
            return false
        }
        for (const feature of this.get_feature_list()) {
            if (!(is_valid_feature(feature))) {
                return false
            }
        }
        return true
    }

    get_feature_list() {
        this.sanify()
        let features = []
        for (const [feature_id, feature_input] of Object.entries(this.features_inputs)) {
            features.push(feature_input.value)
        }
        return features
    }
}