import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-app.js";
import { getDatabase, ref, set, child, get } from 'https://www.gstatic.com/firebasejs/9.9.0/firebase-database.js'

function start() {
    let rend = new Renderer();
    rend.initialise()
}

async function load_json(file) {
    let response = await fetch(file);
    if (response.status != 200) {
        throw new Error("Server Error");
    }
    // read response stream as json
    return await response.json();
}

const firebaseConfig = {
    databaseURL: "https://metaphor-annotation-default-rtdb.firebaseio.com",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

function save_lemma(user_id, queue_id, lemma_id, lemma_data) {
    let promise = set(ref(database, `${user_id}/${queue_id}/${lemma_id}`), lemma_data);
    return promise
}

function load_queue(user_id, queue_id) {
    let promise = get(child(ref(database), `${user_id}/${queue_id}`))
    return promise
}


class Renderer {

    constructor() {

    }

    async initialise() {

        const element = document.getElementById("main");
        element.innerHTML = 'Initialising...'

        this.label_options = ["Literal", "Mixed", "Metaphorical"]
        this.cell_horizontal_spacing = '20px'

        // Load info
        this.concepts_to_definitions = await load_json("data/extracted/concepts_to_definitions.json");
        this.concepts_to_img_flags = await load_json("data/extracted/concepts_to_images.json");
        this.lemmas_to_senses = await load_json("data/extracted/lemmas_to_senses.json");
        this.senses_to_info = await load_json("data/extracted/senses_to_info.json");
        this.lemma_queues = await load_json("data/extracted/queues.json")

        this.initialise_credentials()
    }

    initialise_credentials(){

        const element = document.getElementById("main");

        let that = this

        let form = document.createElement("form");
        form.id = "form"

        // User ID
        form.innerHTML += 'User ID: '
        let name = document.createElement('input')
        name.id = 'user_id'
        name.name = 'user_id'
        name.type = 'text'
        form.appendChild(name)

        // Queue
        form.innerHTML += '<br>Queue ID: '
        let queue = document.createElement('input')
        queue.id = 'queue_id'
        queue.name = 'queue_id'
        queue.type = 'text'
        form.appendChild(queue)
        form.innerHTML += '<br>'

        // Submit
        let submit = document.createElement("input");
        submit.type = "submit"
        form.appendChild(submit)
        form.innerHTML += '<br>'

        // Warning cell
        let warnings = document.createElement('p')
        warnings.style.color = 'red'
        warnings.id = 'warnings'
        form.appendChild(warnings)
        form.onsubmit = function() { return that.submit_credentials() }

        element.innerHTML = ''
        element.appendChild(form)
    }

    submit_credentials() {
        // Sanity check
        const warnings = document.getElementById(`warnings`)
        this.user_id = document.getElementById(`user_id`).value
        this.queue_name = document.getElementById(`queue_id`).value

        if (this.user_id == "") {
            warnings.innerHTML = 'User ID cannot be empty.'
            return false
        }

        if (!(this.queue_name in this.lemma_queues)) {
            warnings.innerHTML = 'Invalid queue ID.'
            return false
        }

        this.queue = this.lemma_queues[this.queue_name]
        this.update_queue_and_render()
        return false
    }

    update_queue_and_render() {
        const element = document.getElementById("main");
        element.innerHTML = 'Loading queue...'
        load_queue(this.user_id, this.queue_name).then((snapshot) => {
            let found = false
            if (snapshot.exists()) {
                // Find queue index
                let user_data = snapshot.val()
                for (let i = 0; i < this.queue.length; i++) {
                    let lemma_i = this.queue[i]
                    if (!(lemma_i in user_data)) {
                        this.queue_index = i
                        found = true
                        break
                    }
                }

            } else {
                // Nothing saved
                found = true
                this.queue_index = 0
            }

            if (found) {
                this.render()
            } else {
                this.final_screen()
            }
        })
    }

    final_screen() {
        const element = document.getElementById("main");
        element.innerHTML = 'Thank you for participating.'
    }

    render() {
        const element = document.getElementById("main");
        // element.innerHTML = 'Rendering...'

        this.literal_mixed_senses = new Set();
        this.metaphorical_senses = new Set();

        let that = this

        this.lemma = this.queue[this.queue_index]

        const sense_ids = this.lemmas_to_senses[this.lemma]

        const word = this.lemma.split(":")[0]
        const pos = this.lemma.split(":")[1]

        this.all_senses = Array.from({length: sense_ids.length}, (_, i) => `${word}(${i + 1})`)

        let form = document.createElement("form");
        form.id = "form"

        let table = document.createElement("table");
        table.style.borderCollapse = 'collapse'
        table.style.marginLeft = 'auto'
        table.style.marginRight = 'auto'
        form.appendChild(table)

        let caption = document.createElement("caption")
        caption.style.fontSize = '150%'
        caption.style.padding = '15px'
        let header = document.createElement("b")
        header.innerHTML = word
        caption.appendChild(header)
        caption.innerHTML += ' (' + pos + ')'
        table.appendChild(caption)

        // Header
        let header_row = document.createElement("tr")
        header_row.style.borderTop = '2px solid black'
        const headers = ['ID', 'Definition', 'Image', 'Label', 'Extra&nbsp;Information']
        for (const header of headers) {
            let cell = document.createElement("td")
            cell.style.padding = `0 ${this.cell_horizontal_spacing}`
            cell.innerHTML = '<b>' + header + '</b>'
            cell.style.textAlign = 'center'
            header_row.appendChild(cell)
        }
        table.appendChild(header_row)

        let index = 1
        let last_row = null
        for (const sense_id of sense_ids) {

            let definition = this.create_definition(sense_id)

            const sense = this.all_senses[index - 1]

            let row = document.createElement("tr");
            row.style.borderTop = '1px solid black'
            row.id = sense
            table.appendChild(row)

            let sense_label = document.createElement("td")
            sense_label.style.padding = `0 ${this.cell_horizontal_spacing}`
            sense_label.innerHTML = '<b>' + sense + '</b>'
            row.appendChild(sense_label)

            let defn = document.createElement("td")
            defn.style.padding = `0 ${this.cell_horizontal_spacing}`
            defn.appendChild(definition)
            row.appendChild(defn)

            let img = document.createElement("td")
            const concept_id = this.senses_to_info[sense_id]['concept_id']

            if (this.concepts_to_img_flags[concept_id]) {
                img.style.padding = `0 ${this.cell_horizontal_spacing}`
                img.style.textAlign = 'center'
                const image_file = `data/extracted/images/${concept_id}.jpg`
                img.innerHTML = `<object data="${image_file}" type="image/jpeg"></object>`
            }
            row.appendChild(img)

            let metaphor_select = document.createElement("td")
            defn.style.padding = `0 ${this.cell_horizontal_spacing}`
            for (const option of this.label_options) {
                let no_break = document.createElement('nobr')
                let label = document.createElement("label");

                const code = `${option.toLowerCase()}_${sense}`
                let input = document.createElement("input");
                input.type = "radio"
                input.id = code
                input.name = `metaphoricity_${sense}`
                input.value = option
                label.onclick = function () {
                    that.select_radio(sense, option.toLowerCase())
                }
                label.appendChild(input)

                label.for = code
                label.innerHTML += option
                label.appendChild(document.createElement("br"))
                no_break.appendChild(label)

                metaphor_select.appendChild(no_break)
            }
            row.appendChild(metaphor_select)

            let metaphor_info = document.createElement("td")
            metaphor_info.style.padding = `0 ${this.cell_horizontal_spacing}`
            let top_line = document.createElement('nobr')
            // metaphor_info_para.style.maxWidth = '280px'
            let dropdown = document.createElement("nobr")
            dropdown.id = `dropdown_${sense}`
            top_line.appendChild(dropdown)
            let dropdown_follow_on = document.createElement("span")
            dropdown_follow_on.id = `dropdown_followon_${sense}`
            top_line.appendChild(dropdown_follow_on)
            top_line.innerHTML += '<br>'
            metaphor_info.appendChild(top_line)

            let similarity = document.createElement("nobr")
            similarity.id = `similarity_${sense}`
            metaphor_info.appendChild(similarity)
            row.appendChild(metaphor_info)

            index++;
            last_row = row

        }
        // Add bottom to last row
        last_row.style.borderBottom = '2px solid black'

        // Footer
        let footer = document.createElement("tr")
        table.appendChild(footer)

        let count_cell = document.createElement('td')
        count_cell.colSpan = '3'
        count_cell.style.paddingTop = `8px`
        count_cell.style.textAlign = 'left'
        count_cell.innerHTML = `<p style="color:grey">${this.queue_index+1}/${this.queue.length}</p>`
        footer.appendChild(count_cell)

        let submit_cell = document.createElement('td')
        submit_cell.colSpan = '2'
        submit_cell.style.paddingTop = `8px`
        submit_cell.style.textAlign = 'right'
        let submit = document.createElement("input");
        submit.type = "submit"
        let guidelines = document.createElement("button")
        guidelines.innerHTML = 'See Guidelines'
        guidelines.onclick = () => {
            window.open('documentation/Metaphor_Annotation_Guidelines.pdf');
        };
        submit_cell.appendChild(guidelines)
        submit_cell.innerHTML += ' '
        submit_cell.appendChild(submit)
        footer.appendChild(submit_cell)

        // Warning cell
        let footer_2 = document.createElement("tr")
        let warning_cell = document.createElement('td')
        warning_cell.colSpan = '5'
        warning_cell.style.paddingTop = `8px`
        warning_cell.id = 'warnings'

        footer_2.appendChild(warning_cell)
        table.appendChild(footer_2)

        // Submit logic
        form.onsubmit = function() { return that.submit_annotation() }

        // Add
        element.innerHTML = '' // Remove loading screen
        element.appendChild(form)
    }

    create_definition(sense_id, deep_linked=true) {
        const sense_info = this.senses_to_info[sense_id]

        let definition = document.createElement('p')

        // Add synonyms
        const synonyms = sense_info['synonyms']
        if (synonyms.length > 0) {
            definition.innerHTML += '['
            for (let i = 0; i < synonyms.length; i++) {
                const synonym = synonyms[i]
                const synonym_string = synonym['string']
                let italic = document.createElement('i')
                italic.innerHTML += synonym_string.replaceAll('_', ' ')
                definition.appendChild(italic)
                if (i < synonyms.length - 1) {
                    definition.innerHTML += ', '
                }
            }
            definition.innerHTML += '] '
        }

        // Add definition
        const definition_string = this.concepts_to_definitions[sense_info['concept_id']]
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

            // Add hyperlinked text
            let linked_text = document.createElement("span");
            linked_text.innerHTML = string.slice(start_index, end_index)
            linked_text.classList.add('tooltip')

            // add hover
            let hover_over = this.create_definition(sense_id, false)
            hover_over.classList.add('tooltiptext')
            linked_text.appendChild(hover_over)

            definition.appendChild(linked_text)
            
            old_end_index = end_index
        }
        definition.innerHTML += string.slice(old_end_index, string.length)
        return definition
    }

    submit_annotation() {
        // Extract data

        let failures = []
        let return_data = {};

        for (const sense_id of this.all_senses) {
            let sense_data = {}
            let label = null
            for (const option of this.label_options) {
                if (document.getElementById(`${option.toLowerCase()}_${sense_id}`).checked) {
                    // TODO assert label is null -- can't have multiple selected
                    label = option.toLowerCase()
                }
            }
            sense_data['label'] = label

            if (label == null) {
                // No radio button selected
                failures.push(`<b>${sense_id}</b> has no label assigned.`)

            } else if (label == "metaphorical") {
                let derived_from = ""
                let similarity = ""
                let dropdown = document.getElementById("select_"+sense_id)
                if (dropdown.selectedIndex > 0) {
                    derived_from = dropdown.value
                    similarity = document.getElementById(`similarity_desc_${sense_id}`).value
                    if (similarity == "") {
                        // No description
                        failures.push(`<b>${sense_id}</b> is metaphorically related to <b>${derived_from}</b>, but no description of the similarity is provided.`)
                    }
                } else {
                    // No metaphorical derivation
                    failures.push(`<b>${sense_id}</b> is labelled as metaphorical, but no similar sense is selected.`)
                }

                sense_data['derivation'] = derived_from
                sense_data['similarity'] = similarity
            }
            return_data[sense_id] = sense_data
        }

        // Either warn or submit

        if (failures.length == 0) {
            // Submit to server
            save_lemma(this.user_id, this.queue_name, this.lemma, return_data).then(() => {
                // Next word
                this.update_queue_and_render()
            })


        } else {
            // Warn
            let warning_box = document.getElementById('warnings')
            let warnings = `<p style="color:red">Unable to submit:<br>`
            for (const failure of failures) {
                warnings += `&nbsp;&nbsp;&nbsp;&nbsp;* ${failure}<br>`
            }
            warnings += "</p>"
            warning_box.innerHTML = warnings
        }

        return false
    }

    select_radio(sense, name) {
        let row = document.getElementById(sense)
        if (name == 'metaphorical') {
            row.style.backgroundColor = '#C0DDFA' // met
            // row.style.color = 'white'
            this.metaphor(sense)
        } else if (name == 'literal') {
            row.style.backgroundColor = '#FAF4DD' // lit
            // row.style.color = 'black'
            this.literal(sense)
        } else {
            row.style.backgroundColor = '#FFDBC2' // mixed
            row.style.color = 'black'
            this.literal(sense)
        }
    }

    metaphor(sense) {
        if (!this.metaphorical_senses.has(sense)) {

            // Remove it from other dropdown lists
            // If it was literal before, then delete those elements
            if (this.literal_mixed_senses.has(sense)) {
                for (const met_sense of this.metaphorical_senses) {
                    let option = document.getElementById(`select_${met_sense}:${sense}`)
                    if (option.selected) {
                        document.getElementById(`select_${met_sense}:blank`).selected = true
                        option.selected = false
                        this.show_similarity(met_sense)
                    }
                    option.disabled = true
                    // option.hidden = true
                }
            }

            // Move it across
            this.metaphorical_senses.add(sense)
            this.literal_mixed_senses.delete(sense)

            // Create the dropdown list
            let select_list = document.createElement("select");
            select_list.id = "select_"+sense;
            let that = this
            select_list.onchange = function(){that.show_similarity(sense)}

            let blank_option = document.createElement("option");
            blank_option.id = select_list.id + ':blank'
            blank_option.value = ''
            blank_option.selected = true
            blank_option.disabled = true
            blank_option.hidden = true
            blank_option.innerHTML = 'Select';
            select_list.appendChild(blank_option)

            // Add options
            for (const other_sense of this.all_senses) {
                let option = document.createElement("option");
                option.id = select_list.id+":"+other_sense
                option.value = other_sense;
                option.text = other_sense;
                if (!this.literal_mixed_senses.has(other_sense)){
                    // Hide
                    option.disabled = true
                    // option.hidden = true
                }
                select_list.appendChild(option);
            }

            // Add it to the correct point
            let insert_point = document.getElementById(`dropdown_${sense}`);
            insert_point.innerHTML = ' It is similar to '
            insert_point.appendChild(select_list);
        }
    }

    literal(sense) {
        if (!this.literal_mixed_senses.has(sense)) {

            // Reassign
            this.literal_mixed_senses.add(sense)
            this.metaphorical_senses.delete(sense)

            // Add it to the dropdown list options
            for (const met_sense of this.metaphorical_senses) {
                let option = document.getElementById(`select_${met_sense}:${sense}`)
                option.disabled = false
                // option.hidden = false
            }

            // Remove the dropdown list and text box
            document.getElementById(`dropdown_${sense}`).innerHTML = '';
            document.getElementById(`similarity_${sense}`).innerHTML = ''
            document.getElementById(`dropdown_followon_${sense}`).innerHTML = ''
        }
    }

    show_similarity(sense) {

        var select = document.getElementById("select_"+sense);
        if(select.selectedIndex <=0) {
            // Nothing selected
            document.getElementById(`similarity_${sense}`).innerHTML = ''
            document.getElementById(`dropdown_followon_${sense}`).innerHTML = ''

        } else {
            // Add text box
            let similarity = document.createElement('input')
            similarity.id = `similarity_desc_${sense}`
            similarity.name = `similarity_desc_${sense}`
            similarity.type = 'text'
            let follow_on = document.getElementById(`dropdown_followon_${sense}`)
            follow_on.innerHTML = ' because'
            let insert_point = document.getElementById(`similarity_${sense}`)
            insert_point.innerHTML = 'they both '
            insert_point.appendChild(similarity)
            insert_point.innerHTML += '.'
        }
    }
}

window.start = start;
