import {make_empty_cell} from "../../utilities.js";

export class WordNetDefinition {

    constructor(lemma, wordnet_sense_id) {
        this.lemma = lemma
        this.original_sense_id = wordnet_sense_id
        this.concept_id = this.lemma.datastore.senses_to_info[this.original_sense_id]['concept_id']
    }

    copy() {
        let defn = new WordNetDefinition(this.lemma, this.original_sense_id)
        defn.make_definition_cell()
        return defn
    }

    make_definition_cell() {
        this.definition_cell = make_empty_cell()
        let definition = this.create_definition(this.original_sense_id)
        this.definition_cell.appendChild(definition)
    }

    make_image_cell() {
        this.image_cell = make_empty_cell()
        if (this.lemma.datastore.concepts_to_img_flags[this.concept_id]) {
            this.image_cell.style.textAlign = 'center'
            const image_file = `data/extracted/images/${this.concept_id}.jpg`
            this.image_cell.innerHTML = `<object data="${image_file}" type="image/jpeg"></object>`
        }
    }

    create_definition(old_sense_id, deep_linked=true) {
        const sense_info = this.lemma.datastore.senses_to_info[old_sense_id]
        const concept_id = sense_info['concept_id']

        let definition = document.createElement('p')

        // Add synonyms
        const synonyms = sense_info['synonyms']
        if (synonyms.length > 0) {
            definition.innerHTML += '['
            for (let i = 0; i < synonyms.length; i++) {
                const synonym = synonyms[i]
                const synonym_string = synonym['string']
                const synonym_sense_id = synonym['sense_id']
                let italic = document.createElement('i')
                italic.innerHTML += synonym_string.replaceAll('_', ' ')
                if (deep_linked) {
                    definition.appendChild(this.linked_word(`<i>${synonym_string.replaceAll('_', ' ')}</i>`, synonym_sense_id))
                } else {
                    definition.appendChild(italic)
                }

                if (i < synonyms.length - 1) {
                    definition.innerHTML += ', '
                }
            }
            definition.innerHTML += '] '
        }

        // Add definition
        const definition_string = this.lemma.datastore.concepts_to_definitions[concept_id]
        if (deep_linked) {
            definition.appendChild(this.hyperlinked_string(definition_string))
        } else {
            definition.innerHTML += definition_string['string']
        }

        // Add examples
        const examples = sense_info['examples']
        if (examples.length > 0) {
            definition.innerHTML += ', e.g. '
            for (let i = 0; i < examples.length; i++) {
                const example = examples[i]
                const example_string = example['string']
                definition.innerHTML += example_string
                if (i < examples.length - 1) {
                    definition.innerHTML += ', '
                }
            }
        }

        return definition
    }

    hyperlinked_string(definition_object) {
        const string = definition_object['string']
        const annotations = definition_object['annotations']
        let definition = document.createElement("span");

        let old_end_index = 0
        for (const annotation of annotations) {
            const start_index = annotation[0]
            const end_index = annotation[1]
            const sense_id = annotation[2]

            // Add text between this annotation and the last
            definition.innerHTML += string.slice(old_end_index, start_index)

            definition.appendChild(this.linked_word(string.slice(start_index, end_index), sense_id))

            old_end_index = end_index
        }
        definition.innerHTML += string.slice(old_end_index, string.length)
        return definition
    }

    linked_word(text_string, old_sense_id) {
        let linked_text = document.createElement("span");
        linked_text.innerHTML = text_string
        linked_text.classList.add('tooltip')

        // add hover
        let hover_over = this.create_definition(old_sense_id, false)
        hover_over.classList.add('tooltiptext')
        linked_text.appendChild(hover_over)

        return linked_text
    }
}