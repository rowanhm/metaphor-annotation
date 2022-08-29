import {Sense} from "../sense.js";

export class LiteralSense extends Sense {

    // Handles extra info of literals (root, related to)
    constructor(sense) {
        super(sense);
        if (!(sense instanceof LiteralSense)) {
            this.group = null
            this.features_inputs = {}
            this.features_index = 0
        } else {
            this.group = sense.group
            this.features_inputs = sense.features_inputs
            this.features_index = sense.features_index
        }
        this.insane = true
    }

    add_feature() {
        let new_feature = document.createElement('input')
        new_feature.type = 'text'
        let that = this
        new_feature.oninput = function () {
            that.refresh_text()
        }
        this.features_inputs[this.features_index] = new_feature
        this.features_index++
        this.insane = true
        this.lemma.refresh()
    }

    delete_feature(feature_id) {
        delete this.features_inputs[feature_id]
        this.insane = true
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

    get_label() {
        return 'Literal'
    }

    sanify() {
        if (this.insane) {
            this.insane = false
        }
    }

    get_group() {
        this.sanify()
        return this.group
    }

    set_group(group_number) {
        console.log(`Setting ${this.new_sense_id} to group ${group_number}`)
        this.group = group_number
        this.insane = true
    }

    set_colour() {
        this.row.style.backgroundColor = '#FAF4DD'
    }

    fill_relation_cell() {
        console.log(`Filling info for ${this.new_sense_id} (group ${this.get_group()})`)
        this.relation_cell.innerHTML = ''
        let no_break = document.createElement('nobr')

        no_break.innerHTML = 'In group '

        let select_group = document.createElement("select");
        select_group.id = `${this.new_sense_id}:group_select`
        let that = this
        select_group.onchange = function(){
            that.update_group()
        }

        let blank_option = document.createElement("option");
        blank_option.value = null
        blank_option.disabled = true
        blank_option.hidden = true
        blank_option.innerHTML = 'select';
        select_group.appendChild(blank_option)

        let found_group = false
        if (this.get_group() === null){
            blank_option.selected = true
            found_group = true
        }

        const groups = this.lemma.get_groups()

        for (const group of groups) {
            if (group !== null) {

                let option = document.createElement("option");
                option.value = group.toString();
                option.text = group.toString();
                if (group === this.get_group()) {
                    // Select
                    option.selected = true
                    found_group = true
                }
                select_group.appendChild(option);
            }
        }

        // Add new group option
        let next_lowest_group = 1
        while (groups.includes(next_lowest_group)) {
            next_lowest_group++
        }

        let option = document.createElement("option");
        option.value = next_lowest_group.toString();
        option.text = `${next_lowest_group} (new)`;
        select_group.appendChild(option);

        if (!found_group) {
            console.error(`Failed to find group for sense ${this.new_sense_id}`)
        }

        no_break.appendChild(select_group)
        this.relation_cell.appendChild(no_break)
    }

    update_group() {
        const dropdown = document.getElementById(`${this.new_sense_id}:group_select`)
        let value = dropdown.value
        if (value !== null) {
            value = parseInt(value)
        }
        this.set_group(value)
        console.log(`${this.new_sense_id} in group ${this.group}`)
        this.lemma.refresh()
    }

    get_data() {
        let sense_data = super.get_data()
        sense_data['group'] = this.get_group()
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
            no_break.appendChild(feature_input)
            feature_cell.appendChild(no_break)

            let delete_cell = document.createElement('td')
            row.appendChild(delete_cell)
            let delete_button = document.createElement("button")
            delete_button.type = 'button'
            delete_button.onclick = function () { that.delete_feature(feature_id) }
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
        create_button.onclick = function () { that.add_feature() }
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
    }

    is_stable() {
        if (this.get_group() !== null) {
            return true
        }
        return false
    }
}