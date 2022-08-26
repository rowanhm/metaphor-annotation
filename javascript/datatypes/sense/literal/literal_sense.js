import {Sense} from "../sense.js";

export class LiteralSense extends Sense {

    // Handles extra info of literals (root, related to)
    constructor(sense) {
        super(sense);
        this.related_to = null
    }

    get_label() {
        return 'Literal'
    }

    sanify() {
        if (this.insane) {
            if (this.related_to !== null) {
                if (this.lemma.new_id_order.includes(this.related_to)) {
                    if (this.new_sense_id !== this.related_to) { // If its a root thats fine
                        const related_sense = this.lemma.get_sense(this.related_to)
                        this.related_to = null
                        if (related_sense instanceof LiteralSense) {  // Derivation sense has to be a metaphor
                            if (related_sense.is_root()) {  // Derivation sense has to have the same group
                                this.related_to = related_sense.new_sense_id
                            }
                        }
                    }
                } else {
                    this.related_to = null
                }
            }
            this.insane = false
        }
    }

    get_related_to() {
        this.sanify()
        return this.related_to
    }

    set_related_to(sense_id) {
        console.log(`Setting ${this.new_sense_id} to be related to ${sense_id}`)
        this.related_to = sense_id
        this.insane = true
    }

    is_root() {
        return (this.get_related_to() === this.new_sense_id)
    }

    fill_row() {
        super.fill_row();
        this.row.style.backgroundColor = '#FAF4DD'
    }

    fill_name_cell() {
        super.fill_name_cell();
        if (this.is_root()) {
            this.name_cell.innerHTML += '&#127794;'
        } else {
            this.name_cell.innerHTML += '&#127807;'
        }
    }

    fill_info_cell() {
        console.log(`Filling info for ${this.new_sense_id} (related to ${this.get_related_to()})`)

        let that = this
        const select_name = `${this.new_sense_id}:root_select`
        this.info_cell.innerHTML = ''

        let list_of_sense_ids = this.lemma.root_sense_ids()
        const position = list_of_sense_ids.indexOf(this.new_sense_id)
        if (position !== -1) {
            list_of_sense_ids.splice(position, 1)
        }
        list_of_sense_ids.unshift(this.new_sense_id)

        let found_related = false
        for (const sense_id of list_of_sense_ids) {
            let no_break = document.createElement('nobr')
            const name = `${this.new_sense_id}:root_select:${sense_id}`

            let input = document.createElement("input");
            input.type = "radio"
            input.name = select_name
            input.id = name
            input.onclick = function () {
                that.set_related_to(sense_id)
                that.lemma.refresh()
            }
            if (this.get_related_to() === sense_id) {
                input.checked = true
                found_related = true
            }
            no_break.appendChild(input)

            let label = document.createElement("label");
            label.htmlFor = name
            if (this.new_sense_id === sense_id) {
                label.innerHTML += 'Root sense'
            } else {
                label.innerHTML += `Related to ${this.lemma.get_sense(sense_id).get_outward_facing_id()}`
            }
            no_break.appendChild(label)

            no_break.appendChild(document.createElement("br"))
            this.info_cell.appendChild(no_break)
        }
        if ((!found_related) && (this.get_related_to() !== null)) {
            console.error(`Could not find related (${this.new_sense_id} related to ${this.get_related_to()})`)
        }
    }
}