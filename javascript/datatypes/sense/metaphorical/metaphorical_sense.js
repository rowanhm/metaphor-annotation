import {Sense} from "../sense.js";
import {LiteralSense} from "../literal/literal_sense.js";

export class MetaphoricalSense extends Sense {

    // Handles extra info of metaphors (derived from, grouping)

    constructor(sense) {
        super(sense);
        this.resembles = null
        this.same_derivation = null

        this.shared_feature_input = document.createElement('input')
        this.shared_feature_input.type = 'text'

        this.missing_feature_input = document.createElement('input')
        this.missing_feature_input.type = 'text'
    }

    get_shared_feature() {
        return this.shared_feature_input.value
    }

    get_missing_feature() {
        return this.missing_feature_input.value
    }

    get_label() {
        return 'Metaphorical'
    }

    get_same_derivation() {
        this.sanify()
        return this.same_derivation
    }

    set_same_derivation(sense_id) {
        this.same_derivation = sense_id
        this.insane = true
    }

    get_resembles() {
        this.sanify()
        return this.resembles
    }

    set_resembles(sense_id) {
        this.resembles = sense_id
        this.insane = true
    }

    sanify() {
        if (this.insane) {
            // Make sure the thing it resembles is a literal
            if (this.resembles !== null) {
                if (!this.lemma.new_id_order.includes(this.resembles)) {
                    this.resembles = null
                } else if (!(this.lemma.get_sense(this.resembles) instanceof LiteralSense)) {
                    this.resembles = null
                }
            }

            // Make sure the thing it is similar to is a metaphor, and the same resembles
            if (this.same_derivation !== null) {
                if (this.lemma.new_id_order.includes(this.resembles)) {
                    const derivation_sense = this.lemma.get_sense(this.same_derivation)
                    this.same_derivation = null
                    if (derivation_sense instanceof MetaphoricalSense) {  // Derivation sense has to be a metaphor
                        if (derivation_sense.get_resembles() === this.resembles) {  // Derivation sense has to have the same group
                            if (derivation_sense.get_same_derivation() === null) {  // Derivation sense has to be a root
                                this.same_derivation = derivation_sense.new_sense_id
                            }
                        }
                    }
                }
            }
            this.insane = false
        }
    }

    set_colour() {
        this.row.style.backgroundColor = '#C0DDFA'
    }

    fill_info_cell() {
        // Make dropdown selection
        this.info_cell.innerHTML = ''

        let resemblance_cell = document.createElement('nobr')
        resemblance_cell.innerHTML = 'Resembles '

        let select_resemblance = document.createElement("select");
        select_resemblance.id = `${this.new_sense_id}:resemblance_select`
        let that = this
        select_resemblance.onchange = function(){
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
        this.info_cell.appendChild(resemblance_cell)

        // Continue if it has something selected
        if (this.get_resembles() !== null) {

            this.info_cell.appendChild(document.createElement('hr'))

            // Derivation part

            let derivation_cell = document.createElement('div')
            derivation_cell.innerHTML = ''

            let no_break = document.createElement('nobr')
            no_break.innerHTML = 'Same derivation as '

            let select_derivation = document.createElement("select");
            select_derivation.id = `${this.new_sense_id}:derivation_select`
            select_derivation.onchange = function () {
                that.update_derivation()
            }

            let new_option = document.createElement("option");
            new_option.value = null
            new_option.disabled = false
            new_option.text = 'none (new derivation)';
            select_derivation.appendChild(new_option)

            // Add options
            let found_derivation = false
            if (this.get_same_derivation() === null) {
                new_option.selected = true
                found_derivation = true
            }
            for (const other_sense of this.lemma.all_senses()) {
                const other_sense_id = other_sense.new_sense_id
                let option = document.createElement("option");
                option.value = other_sense_id;
                option.text = other_sense.get_outward_facing_id();
                option.disabled = true
                if (other_sense instanceof MetaphoricalSense) {
                    if (other_sense.get_resembles() === this.get_resembles() && other_sense_id !== this.new_sense_id && other_sense.get_same_derivation() === null)
                        option.disabled = false
                    if (other_sense_id === this.get_same_derivation()) {
                        // Select
                        option.selected = true
                        found_derivation = true
                    }
                }
                select_derivation.appendChild(option);
            }
            if (!found_derivation) {
                console.error('Failed to find derivation')
            }

            no_break.appendChild(select_derivation)
            derivation_cell.appendChild(no_break)

            if (this.get_same_derivation() === null && this.get_resembles() !== null) {
                derivation_cell.appendChild(document.createElement('br'))
                const resembles_name = this.lemma.get_sense(this.get_resembles()).get_outward_facing_id()
                let para = document.createElement('p')

                para.innerHTML = `This sense is similar to ${resembles_name} because they both `

                para.appendChild(this.shared_feature_input)
                let span = document.createElement('span')
                span.innerHTML = ` but different because only ${resembles_name} `
                para.appendChild(span)
                para.appendChild(this.missing_feature_input)
                derivation_cell.appendChild(para)
            }

            this.info_cell.appendChild(derivation_cell)
        }
    }

    update_resembles() {
        const dropdown = document.getElementById(`${this.new_sense_id}:resemblance_select`)
        this.set_resembles(dropdown.value)
        console.log(`${this.new_sense_id} resembles ${this.resembles}`)
        this.lemma.refresh()
    }

    update_derivation() {
        const dropdown = document.getElementById(`${this.new_sense_id}:derivation_select`)
        this.set_same_derivation(dropdown.value)
        console.log(`${this.new_sense_id} same derivation as ${this.same_derivation}`)
        this.lemma.refresh()
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['resembles'] = this.lemma.get_sense(this.get_resembles()).backend_sense_id
        const derivation = this.get_same_derivation()
        if (derivation === null) {
            sense_data['shared_feature'] = this.get_shared_feature()
            sense_data['missing_feature'] = this.get_missing_feature()
        } else{
            sense_data['same_derivation_as'] = this.lemma.get_sense(this.get_same_derivation()).backend_sense_id
        }
        return sense_data
    }
}