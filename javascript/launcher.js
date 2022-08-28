import {load_json, load_queue} from "./io.js";
import {Datastore} from "./datastore.js";
import {Screen} from "./screen.js"

class Manager {

    constructor() {
        this.main = document.getElementById("main");

    }

    async initialise_credentials(){

        this.set_screen_text('Loading...')

        this.lemma_queues = await load_json("data/extracted/queues.json")
        this.queue = this.lemma_queues[this.queue_name]
        this.datastore = new Datastore()
        await this.datastore.load()

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

        if (this.user_id === "") {
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

    set_screen_text(process_text) {
        this.main.innerHTML = process_text
    }

    update_queue_and_render() {
        this.set_screen_text('Loading queue...')
        load_queue(this.user_id, this.queue_name).then((snapshot) => {
            let found = false
            if (snapshot.exists()) {
                // Find queue index by going through until one isn't done
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
                this.set_screen_text('Thank you for participating.')
            }
        })
    }

    render() {
        this.set_screen_text('Rendering...')
        const lemma = this.queue[this.queue_index]
        new Screen(lemma, this)
    }

}

function start() {
    let rend = new Manager();
    rend.initialise_credentials()
}

window.start = start;
