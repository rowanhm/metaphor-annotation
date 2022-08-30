import {Sense} from "./sense/sense.js";
import {MetaphoricalSense} from "./sense/metaphorical/metaphorical_sense.js";
import {LiteralSense} from "./sense/literal/literal_sense.js";
import {MixedLiteralSense} from "./sense/literal/mixed_literal_sense.js";
import {GhostLiteralSense} from "./sense/literal/ghost_literal_sense.js";

export class Lemma {

    constructor(lemma_name, datastore) {
        this.lemma_name = lemma_name
        this.datastore = datastore

        this.word = this.lemma_name.split(":")[0]
        this.pos = this.lemma_name.split(":")[1]

        // Make this a map of new_ids -> sense objects
        this.new_id_to_sense = new Map()
        this.new_id_order = []
        let i = 1
        for (const old_id of this.datastore.lemmas_to_senses[this.lemma_name]) {
            const new_id = i.toString()
            let sense = new Sense(null)
            sense.initialise_wordnet_sense(this, old_id, new_id)
            i++
        }
        this.next_available_index = i

        this.new_sense_id = 0
    }

    is_stable() {
        let stable = true
        for (const sense of this.all_senses()) {
            if (!sense.is_stable()) {
                stable = false
            }
        }
        return stable
    }

    get_next_new_sense_id() {
        this.new_sense_id += 1
        return this.new_sense_id
    }

    all_senses() {
        let output = []
        for (const new_id of this.new_id_order) {
            output.push(this.new_id_to_sense.get(new_id))
        }
        return output
    }

    get_groups() {
        let groups = new Set()
        for (const sense of this.literal_senses()) {
            groups.add(sense.get_group())
        }
        let groups_ordered = Array.from(groups).sort((a, b) => a - b);
        return groups_ordered
    }

    metaphorical_senses() {
        let output = []
        for (const sense of this.all_senses()) {
            if (sense instanceof MetaphoricalSense) {
                output.push(sense)
            }
        }
        return output
    }

    literal_senses() {
        let output = []
        for (const sense of this.all_senses()) {
            if (sense instanceof LiteralSense) {
                output.push(sense)
            }
        }
        return output
    }

    get_sense(sense_id) {
        return this.new_id_to_sense.get(sense_id)
    }

    refresh() {
        let body = document.getElementById('table_body')
        body.innerHTML = ''
        for (const new_id of this.new_id_order) {
            const sense = this.new_id_to_sense.get(new_id)
            body.appendChild(sense.get_row())
        }
    }

    mark_all_insane() {
        for (const sense of this.all_senses()) {
            sense.mark_insane()
        }
    }

    new_ghost_sense() {
        const new_id = this.next_available_index.toString()
        this.next_available_index++
        new GhostLiteralSense(this, new_id)
        this.mark_all_insane()
        this.refresh()
    }

    delete_ghost_sense(new_sense_id) {
        let sense = this.new_id_to_sense.get(new_sense_id)
        sense.remove()
        this.mark_all_insane()
        this.refresh()
    }

    split_mixed_sense(new_sense_id) {
        let sense = this.new_id_to_sense.get(new_sense_id)
        new MixedLiteralSense(sense) // implicitly creates met half
        this.mark_all_insane()
        this.refresh()
    }

    merge_mixed_sense(new_sense_id) {
        let sense = this.new_id_to_sense.get(new_sense_id)
        const insert_position = sense.remove()
        // Reinsert the base sense
        let base_sense = sense.base_sense
        base_sense.embed(insert_position)
        base_sense.build_cells() // Needed to fix reference issue
        new Sense(base_sense) // Downcast it to remove literality
        this.mark_all_insane()
        this.refresh()
    }

    set_label(new_sense_id, option) {
        let sense = this.new_id_to_sense.get(new_sense_id)
        if (option === 'metaphorical') {
            new MetaphoricalSense(sense)
        } else if (option === 'literal') {
            new LiteralSense(sense)
        } else {
            console.error(`Invalid option for label change: ${option}`)
        }
        this.mark_all_insane()
        this.refresh()
    }

    get_data() {
        let return_data = {};

        for (const sense of this.all_senses()) {
            const sense_id = sense.backend_sense_id
            let sense_data = sense.get_data()
            if (sense_id in return_data) {
                // Add the additional data
                for (const [key, value] of Object.entries(sense_data)) {
                    return_data[sense_id][key] = value
                }
            } else {
                return_data[sense_id] = sense_data
            }
        }

        return return_data
    }

    get_feature_list() {
        let features = []
        for (const sense of this.all_senses()) {
            features = features.concat(sense.get_feature_list())
        }
        return features
    }
}