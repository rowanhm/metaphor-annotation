import {Sense} from "../sense.js";
import {LiteralSense} from "../literal/literal_sense.js";
import {autocomplete} from "../../../autocompletion.js";
import {is_valid_feature} from "../../../utilities.js";

export class MetaphoricalSense extends Sense {

    // Handles extra info of metaphors (derived from, grouping)

    constructor(sense) {
        super(sense);
        this.resembles = null
        this.reset_features()
    }


    set_feature_label(feature_id, label) {
        this.feature_labels[feature_id] = label
        this.insane = true
        this.lemma.refresh()
    }

    get_feature_label(feature_id) {
        this.sanify()
        return this.feature_labels[feature_id]
    }

    get_feature_labels() {
        this.sanify()
        return this.feature_labels
    }

    get_transformation_input(feature_id) {
        this.sanify()
        return this.feature_transformation_inputs[feature_id]
    }

    get_transformations() {
        this.sanify()
        let output = {}
        for (const [feature_id, transformation_input] of Object.entries(this.feature_transformation_inputs)) {
            output[feature_id] = transformation_input.value
        }
        return output
    }

    get_label() {
        return 'Metaphorical'
    }

    get_resembles() {
        this.sanify()
        return this.resembles
    }

    set_resembles(sense_id) {
        if (this.resembles !== sense_id) {
            this.reset_features()
            this.resembles = sense_id
            this.insane = true
            this.lemma.refresh()
        }
    }

    reset_features() {
        this.feature_labels = {}
        this.feature_transformation_inputs = {}
        this.insane = true
    }

    sanify() {
        if (this.insane) {
            // Make sure the thing it resembles is a literal
            let resembles_sense = null
            if (this.resembles !== null) {
                resembles_sense = this.lemma.get_sense(this.resembles)

                if (!this.lemma.new_id_order.includes(this.resembles)) {
                    this.resembles = null
                } else if (!(resembles_sense instanceof LiteralSense)) {
                    this.resembles = null
                }
            }

            // Handle features
            if (this.resembles !== null) {

                let found_features = new Set()
                const features = resembles_sense.get_features()
                // Create feature_labels for missing features
                for (const [feature_id, feature_text] of Object.entries(features)) {
                    found_features.add(feature_id)
                    if (!(feature_id in this.feature_labels)) {
                        this.feature_labels[feature_id] = null
                    }
                }

                // Remove feature_labels for features not in literal parent
                // Remove feature_transformations for features not in literal parent
                let that = this
                for (const [feature_id, feature_label] of Object.entries(this.feature_labels)) {
                    if (!(found_features.has(feature_id))) {
                        delete this.feature_labels[feature_id]
                        if (feature_id in this.feature_transformation_inputs) {
                            delete this.feature_transformation_inputs[feature_id]
                        }
                    } else {
                        // Is contained
                        if (this.feature_labels[feature_id] !== 'modified') {
                            if (feature_id in this.feature_transformation_inputs) {
                                delete this.feature_transformation_inputs[feature_id]
                            }
                        } else {
                            if (!(feature_id in this.feature_transformation_inputs)) {
                                // Add the transformation
                                // If it is transformed, initialise the value with the same text
                                let feature_transformation_input = document.createElement('input')
                                feature_transformation_input.oninput = function() {
                                    that.fill_name_cell()
                                }
                                feature_transformation_input.type = 'text'
                                feature_transformation_input.value = this.lemma.get_sense(this.resembles).get_feature(feature_id)
                                autocomplete(feature_transformation_input, this.lemma.datastore.feature_list)
                                this.feature_transformation_inputs[feature_id] = feature_transformation_input
                            }
                        }
                    }
                }

            } else {
                // Reset features
                this.reset_features()
            }
            this.insane = false
        }
    }

    set_colour() {
        this.row.style.backgroundColor = '#C0DDFA'
    }

    fill_relation_cell() {
        // Make dropdown selection
        this.relation_cell.innerHTML = ''

        let resemblance_cell = document.createElement('nobr')
        resemblance_cell.innerHTML = 'Resembles '

        let select_resemblance = document.createElement("select");
        select_resemblance.id = `${this.new_sense_id}:resemblance_select`
        let that = this
        select_resemblance.onchange = function(){
            that.lemma.screen.logs.log('set_resembles', that.backend_sense_id, that.lemma.get_sense(document.getElementById(`${that.new_sense_id}:resemblance_select`).value).backend_sense_id)
            that.update_resembles()
        }

        let blank_option = document.createElement("option");
        blank_option.value = null
        blank_option.disabled = true
        blank_option.hidden = true
        blank_option.innerHTML = 'select';
        select_resemblance.appendChild(blank_option)

        // Add options
        let found_resembles = false
        if (this.get_resembles() === null) {
            blank_option.selected = true
            found_resembles = true
        }
        for (const other_sense of this.lemma.all_senses()) {
            const other_sense_id = other_sense.new_sense_id
            let option = document.createElement("option");
            option.value = other_sense_id;
            option.text = other_sense.get_outward_facing_id();
            if (other_sense instanceof LiteralSense) {
                if (other_sense_id === this.get_resembles()) {
                    // Select
                    option.selected = true
                    found_resembles = true
                }
            } else {
                // Hide
                option.disabled = true
            }
            select_resemblance.appendChild(option);
        }
        if (!found_resembles) {
            console.error(`Failed to find resembled (${this.new_sense_id} resembles ${this.get_resembles()})`)
        }

        resemblance_cell.appendChild(select_resemblance)
        this.relation_cell.appendChild(resemblance_cell)
    }

    fill_features_cell() {
        this.feature_cell.innerHTML = ''
        const resembles_sense = this.lemma.get_sense(this.get_resembles())
        if (this.get_resembles() === null) {
            // No resembled sense selected
            let instruction_text = document.createElement('i')
            instruction_text.innerHTML = 'Select a resemblance to inherit its features'
            this.feature_cell.appendChild(instruction_text)
        } else {
            const features = resembles_sense.get_features()
            if (Object.keys(features).length === 0) {
                // No features
                let instruction_text = document.createElement('i')
                instruction_text.innerHTML = `Add features to ${resembles_sense.get_outward_facing_id()} to get started`
                this.feature_cell.appendChild(instruction_text)
            } else {
                // Iterate through the shared features and the mapping
                let subtable = document.createElement('table')
                this.feature_cell.appendChild(subtable)

                for (const [feature_id, feature_text] of Object.entries(features)) {
                    let row = document.createElement('tr')
                    subtable.appendChild(row)

                    // Add text
                    let text_cell = document.createElement('td')
                    text_cell.style.textAlign = 'left'
                    let no_break = document.createElement('nobr')
                    no_break.innerHTML = `This thing ${feature_text}?`
                    text_cell.appendChild(no_break)
                    row.appendChild(text_cell)

                    // Add options
                    let radio_cell = document.createElement('td')
                    let option_list = document.createElement('nobr')
                    row.appendChild(radio_cell)
                    radio_cell.appendChild(option_list)

                    const radio_name = `${this.new_sense_id}:feature_select_${feature_id}`
                    let that = this
                    const feature_label = this.get_feature_label(feature_id)
                    for (const option of ['Yes', 'No', 'Modified']) {
                        const name = `${radio_name}:${option.toLowerCase()}`

                        let input = document.createElement("input");
                        input.type = "radio"
                        input.name = radio_name
                        input.id = name
                        input.onclick = function () {
                            that.lemma.screen.logs.log(`label_feature(${option.toLowerCase()})`, that.backend_sense_id, `feature_${feature_id}`)
                            that.set_feature_label(feature_id, option.toLowerCase())
                        }
                        option_list.appendChild(input)

                        let label = document.createElement("label");
                        label.htmlFor = name
                        label.innerHTML += option

                        if (option.toLowerCase() === feature_label){
                            input.checked = true
                        }

                        option_list.appendChild(label)

                    }

                    // Add transformation row
                    if (feature_label === 'modified') {
                        let modification_row = document.createElement('tr')
                        let modification_cell = document.createElement('td')
                        modification_cell.style.textAlign = 'left'

                        let no_break = document.createElement('nobr')

                        subtable.appendChild(modification_row)
                        modification_row.appendChild(modification_cell)
                        modification_cell.colSpan = '2'

                        modification_cell.appendChild(no_break)
                        no_break.innerHTML = '=> This thing '

                        let feature_transformation_wrapper = document.createElement('div')
                        feature_transformation_wrapper.className = 'autocomplete'
                        feature_transformation_wrapper.appendChild(this.get_transformation_input(feature_id))

                        no_break.appendChild(feature_transformation_wrapper)
                    }
                }
            }
        }
    }

    update_resembles() {
        const dropdown = document.getElementById(`${this.new_sense_id}:resemblance_select`)
        this.set_resembles(dropdown.value)
        console.log(`${this.new_sense_id} resembles ${this.resembles}`)
        this.lemma.refresh()
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['resembles'] = this.lemma.get_sense(this.get_resembles()).backend_sense_id
        sense_data['feature_map'] = this.get_feature_labels()
        sense_data['feature_modifications'] = this.get_transformations()
        return sense_data
    }

    is_stable() {
        if (this.get_resembles() === null) {
            return false
        }
        let found_neg_feature = false
        let found_pos_feature = false
        let found_modified_feature = false
        for (const [feature_id, feature_label] of Object.entries(this.get_feature_labels())) {
            if (feature_label === 'yes') {
                found_pos_feature = true
            } else if (feature_label === 'no') {
                found_neg_feature = true
            } else if (feature_label === 'modified') {
                if (!(is_valid_feature(this.get_transformation_input(feature_id).value))) {
                    return false
                }
                if (this.get_transformation_input(feature_id).value === this.lemma.get_sense(this.get_resembles()).get_feature(feature_id)) {
                    return false
                }
                found_modified_feature = true
            } else {
                // feature is null
                return false
            }
        }
        if ((found_neg_feature && found_pos_feature) || found_modified_feature) {
            return true
        } else {
            return false
        }
    }

    get_feature_list() {
        this.sanify()
        let features = []
        for (const [feature_id, feature_input] of Object.entries(this.feature_transformation_inputs)) {
            features.push(feature_input.value)
        }
        return features
    }
}