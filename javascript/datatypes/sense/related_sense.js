import {LiteralSense} from "./literal_sense.js";

export class RelatedSense extends LiteralSense {

    constructor(sense) {
        super(sense);
        if (!(sense instanceof RelatedSense)) {
            this.resembles = null
        } else {
            this.resembles = sense.resembles
        }
        this.label = 'Related'
        this.systematic = null
    }

    set_colour() {
        this.row.style.backgroundColor = '#E5FFD9'
    }

    get_systematic() {
        this.sanify()
        return this.systematic
    }

    is_stable() {
        if (!super.is_stable()) {
            return false
        }
        if (this.get_resembles() === null) {
            return false
        }
        if (this.get_systematic() === null) {
            return false
        }
        return true
    }

    sanify() {
        if (this.insane) {
            super.sanify()
            this.insane = true

            // Make sure the thing it resembles is a literal root
            let resembles_sense = null
            if (this.resembles !== null) {
                resembles_sense = this.lemma.get_sense(this.resembles)

                if (!this.lemma.new_id_order.includes(this.resembles)) {
                    this.resembles = null
                } else if (!(resembles_sense instanceof LiteralSense && (!(resembles_sense instanceof RelatedSense)))) {
                    this.resembles = null
                }
            }

            if (this.resembles === null) {
                this.systematic = null
            }
            this.insane = false
        }
    }


    get_resembles() {
        this.sanify()
        return this.resembles
    }

    set_resembles(sense_id) {
        if (this.resembles !== sense_id) {
            this.resembles = sense_id
            this.systematic = null
            this.insane = true
            this.lemma.refresh()
        }
    }

    set_systematic(bool) {
        if (bool !== this.systematic) {
            this.systematic = bool
            this.insane = true
            this.lemma.refresh()
        }
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['related_to'] = this.lemma.get_sense(this.get_resembles()).backend_sense_id
        sense_data['systematic_relation'] = this.get_systematic()
        return sense_data
    }

    update_resembles() {
        const dropdown = document.getElementById(`${this.new_sense_id}:resemblance_select`)
        this.set_resembles(dropdown.value)
        console.log(`${this.new_sense_id} resembles ${this.resembles}`)
        this.lemma.refresh()
    }

    fill_relation_cell() {
        // Make dropdown selection
        this.relation_cell.innerHTML = ''

        let resemblance_cell = document.createElement('nobr')
        // resemblance_cell.innerHTML = 'Connects to '

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
            if (other_sense instanceof LiteralSense && (!(other_sense instanceof RelatedSense))) {
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
        this.relation_cell.appendChild(document.createElement('br'))

        const systematicity_name = `${this.new_sense_id}:systematicity`

        // Add ad-hoc vs. systematic choice
        let systematicity = document.createElement('span')
        for (const [option, bool] of [['Systematic', true], ['Ad-hoc', false]]) {

            const name = `${systematicity_name}:${option}`

            let line = document.createElement('nobr')

            // Select box
            let checkbox = document.createElement('input')
            checkbox.type = 'radio'
            checkbox.name = systematicity_name
            checkbox.id = name
            if (this.get_systematic() === bool) {
                checkbox.checked = true
            }
            checkbox.onclick = function () {
                that.set_systematic(bool)
            }
            line.appendChild(checkbox)

            // Label
            let label = document.createElement("label");
            label.htmlFor = name
            label.innerHTML = option
            line.appendChild(label)

            // Linebreak
            line.appendChild(document.createElement("br"))

            systematicity.appendChild(line)
        }
        this.relation_cell.appendChild(systematicity)
    }
}
