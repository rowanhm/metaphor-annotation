import {Sense} from "../sense.js";

export class LiteralSense extends Sense {

    // Handles extra info of literals (root, related to)
    constructor(sense) {
        super(sense);
        if (!(sense instanceof LiteralSense)) {
            this.group = null
        } else {
            this.group = sense.group
        }
        this.insane = true
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

    fill_info_cell() {
        console.log(`Filling info for ${this.new_sense_id} (group ${this.get_group()})`)
        this.info_cell.innerHTML = ''
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
        this.info_cell.appendChild(no_break)
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
        return sense_data
    }
}