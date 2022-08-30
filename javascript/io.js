import {initializeApp} from "https://www.gstatic.com/firebasejs/9.9.0/firebase-app.js";
import {getDatabase, ref, set, child, get} from 'https://www.gstatic.com/firebasejs/9.9.0/firebase-database.js'

export async function load_json(file) {
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

export function save_lemma(user_id, queue_id, lemma_id, lemma_data) {
    let promise = set(ref(database, `${user_id}/queues/${queue_id}/${lemma_id}`), lemma_data);
    return promise
}

export function load_queue(user_id, queue_id) {
    let promise = get(child(ref(database), `${user_id}/queues/${queue_id}`))
    return promise
}

export function load_features(user_id) {
    let promise = get(child(ref(database), `${user_id}/features`))
    return promise
}

export function save_features(user_id, feature_frequencies) {
    let promise = set(ref(database, `${user_id}/features`), feature_frequencies);
    return promise
}

export function save_logs(user_id, logs, lemma_id) {
    let promise = set(ref(database, `${user_id}/logs/${lemma_id}`), logs);
    return promise
}