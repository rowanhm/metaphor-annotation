import {Lemma} from "./datatypes/lemma.js";
import {save_lemma} from "./io.js";
import {make_empty_cell} from "./utilities.js";

export class Screen {

    constructor(lemma_name, manager) {
        let that = this
        this.manager = manager

        console.log(`Initialising lemma ${lemma_name}`)
        this.lemma = new Lemma(lemma_name, this.manager.datastore)

        console.log(`Creating form and table title`)
        const element = document.getElementById("main");
        let form = document.createElement("form");
        form.id = "form"

        let table = document.createElement("table");
        table.id = 'table'
        table.style.borderCollapse = 'collapse'
        table.style.marginLeft = 'auto'
        table.style.marginRight = 'auto'
        form.appendChild(table)

        let caption = document.createElement("caption")
        caption.style.fontSize = '150%'
        caption.style.padding = '15px'

        let title = document.createElement("b")
        title.innerHTML = this.lemma.word
        caption.appendChild(title)
        caption.innerHTML += ' (' + this.lemma.pos + ')'
        table.appendChild(caption)

        console.log(`Adding header`)
        let header = document.createElement('thead')
        let header_row = document.createElement("tr")
        header_row.style.borderTop = '2px solid black'
        const headers = ['ID', 'Definition', 'Image', 'Label', 'Extra&nbsp;Information', 'Tools']
        for (const header of headers) {
            let cell = make_empty_cell()
            cell.innerHTML = '<b>' + header + '</b>'
            cell.style.textAlign = 'center'
            header_row.appendChild(cell)
        }
        header.appendChild(header_row)
        table.appendChild(header)

        let body = document.createElement('tbody')
        body.id = 'table_body'
        table.appendChild(body)

        console.log(`Adding footer`)
        let footer = document.createElement('tfoot')
        let footer_row = document.createElement("tr")
        footer_row.id = 'footer'
        footer_row.style.borderTop = '2px solid black'
        footer.appendChild(footer_row)
        table.appendChild(footer)

        let count_cell = document.createElement('td')
        count_cell.colSpan = '2'
        count_cell.style.paddingTop = `8px`
        count_cell.style.textAlign = 'left'
        count_cell.innerHTML = `<p style="color:grey">${this.manager.queue_index+1}/${this.manager.queue.length}</p>`
        footer_row.appendChild(count_cell)

        let submit_cell = document.createElement('td')
        submit_cell.colSpan = '4'
        submit_cell.style.paddingTop = `8px`
        submit_cell.style.textAlign = 'right'
        let submit = document.createElement("input");
        submit.type = "submit"
        let guidelines = document.createElement("button")
        guidelines.type = 'button'
        guidelines.onclick = function () { that.open_guidelines() }
        guidelines.innerHTML = 'See Guidelines'
        let new_sense = document.createElement("button")
        new_sense.type = 'button'
        new_sense.onclick = function () { that.lemma.new_ghost_sense() }
        new_sense.innerHTML = 'New ghost sense'

        submit_cell.appendChild(new_sense)
        submit_cell.appendChild(guidelines)
        submit_cell.appendChild(submit)
        footer_row.appendChild(submit_cell)

        // Warning cell
        let footer_row_2 = document.createElement("tr")
        let warning_cell = document.createElement('td')
        warning_cell.colSpan = '5'
        warning_cell.style.paddingTop = `8px`
        warning_cell.id = 'warnings'

        footer_row_2.appendChild(warning_cell)
        footer.appendChild(footer_row_2)

        // Submit logic
        form.onsubmit = function() { return that.submit_annotation() }

        // Add
        element.innerHTML = '' // Remove loading screen
        element.appendChild(form)

        console.log(`Adding senses`)
        this.lemma.refresh()
    }

    open_guidelines() {
        console.log('Opening guidelines')
        window.open('documentation/Metaphor_Annotation_Guidelines.pdf')
        return false
    }

    submit_annotation() {
        // Extract data

        let return_data = {};

        for (const sense of this.lemma.all_senses()) {
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

        save_lemma(this.manager.user_id, this.manager.queue_name, this.lemma.lemma_name, return_data).then(() => {
            // Next word
            this.manager.update_queue_and_render()
        })

        return false
    }
}