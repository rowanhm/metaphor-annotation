import {load_json, load_queue} from "./io.js";
import {Datastore} from "./datastore.js";
import {Screen} from "./screen.js"

class Manager {

    constructor() {
        this.main = document.getElementById("main");
    }

    async initialise(user_id, queue_id) {
        console.log(`Initialising user ${user_id} with queue ${queue_id}`)
        this.set_screen_text('Loading data...')
        this.user_id = user_id
        this.queue_name = queue_id

        this.lemma_queues = await load_json("data/extracted/queues.json")
        this.queue = this.lemma_queues[this.queue_name]
        this.datastore = new Datastore()
        await this.datastore.load()
        this.update_queue_and_render()
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
    rend.initialise('test', 'noun001')
}

window.start = start;
