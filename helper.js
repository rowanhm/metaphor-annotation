let all_senses = null
let literal_mixed_senses = new Set();
let metaphorical_senses = new Set();
const label_options = ["Literal", "Metaphorical", "Mixed"]
const cell_horizontal_spacing = '20px'
function render()
{
    // TODO update this to load definitions
    let word = 'test'
    let definitions = ["Definition 1", "Definition 2", "Definition 3", "Definition 4"];

    all_senses = Array.from({length: definitions.length}, (_, i) => `${word}_${i + 1}`)

    const element = document.getElementById("main");

    let form = document.createElement("form");
    element.appendChild(form)

    let table = document.createElement("table");
    table.style.borderCollapse = 'collapse'
    table.style.marginLeft = 'auto'
    table.style.marginRight = 'auto'
    form.appendChild(table)

    let caption = document.createElement("caption")
    let header = document.createElement("h2")
    header.innerHTML = word
    caption.appendChild(header)
    table.appendChild(caption)

    // Header
    let header_row = document.createElement("tr")
    header_row.style.borderTop = '2px solid black'
    const headers = ['ID', 'Definition', 'Label', 'Extra Information']
    for (const header of headers) {
        let cell = document.createElement("td")
        cell.style.padding = `0 ${cell_horizontal_spacing}`
        cell.innerHTML = '<b>' + header + '</b>'
        cell.style.textAlign = 'center'
        header_row.appendChild(cell)
    }
    table.appendChild(header_row)

    let index = 1
    let last_row = null
    for (const definition of definitions) {
        const sense = all_senses[index-1]

        let row = document.createElement("tr");
        row.style.borderTop = '1px solid black'
        row.id = sense
        table.appendChild(row)

        let sense_label = document.createElement("td")
        sense_label.style.padding = `0 ${cell_horizontal_spacing}`
        sense_label.innerHTML = '<b>' + sense + '</b>'
        row.appendChild(sense_label)

        let defn = document.createElement("td")
        defn.style.padding = `0 ${cell_horizontal_spacing}`
        defn.innerHTML = definition
        row.appendChild(defn)

        let metaphor_select = document.createElement("td")
        defn.style.padding = `0 ${cell_horizontal_spacing}`
        for (const option of label_options) {
            const code = `${option.toLowerCase()}_${sense}`
            let input = document.createElement("input");
            input.type = "radio"
            input.id = code
            input.name = `metaphoricity_${sense}`
            input.value = option
            input.onclick = function(){select_radio(sense, option.toLowerCase())}
            metaphor_select.appendChild(input)

            let label = document.createElement("label");
            label.for = code
            label.innerHTML = option
            label.appendChild(document.createElement("br"))
            metaphor_select.appendChild(label)
        }
        row.appendChild(metaphor_select)

        let metaphor_info = document.createElement("td")
        metaphor_info.style.padding = `0 ${cell_horizontal_spacing}`
        let dropdown = document.createElement("span")
        dropdown.id = `dropdown_${sense}`
        metaphor_info.appendChild(dropdown)
        let similarity = document.createElement("span")
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
    let footer_cell = document.createElement('td')
    footer_cell.colSpan = '4'
    footer_cell.style.paddingTop = `8px`
    footer_cell.style.textAlign = 'right'
    table.appendChild(footer)
    footer.appendChild(footer_cell)
    let submit = document.createElement("input");
    submit.type = "submit"
    footer_cell.appendChild(submit)

}

function select_radio(sense, name) {
    if (name == 'metaphorical') {
        metaphor(sense)
    } else {
        literal(sense)
    }
}

function metaphor(sense)
{
    if (!metaphorical_senses.has(sense)) {

        // Change colour
        let row = document.getElementById(sense)
        row.style.backgroundColor = 'purple'
        row.style.color = 'white'

        // Remove it from other dropdown lists
        // If it was literal before, then delete those elements
        if (literal_mixed_senses.has(sense)) {
            for (const met_sense of metaphorical_senses) {
                let option = document.getElementById(`select_${met_sense}:${sense}`)
                if (option.selected) {
                    document.getElementById(`select_${met_sense}:blank`).selected = true
                    option.selected = false
                    show_similarity(met_sense)
                }
                option.disabled = true
                option.hidden = true
            }
        }

        // Move it across
        metaphorical_senses.add(sense)
        literal_mixed_senses.delete(sense)

        // Create the dropdown list
        let select_list = document.createElement("select");
        select_list.id = "select_"+sense;
        select_list.onchange = function(){show_similarity(sense)}

        let blank_option = document.createElement("option");
        blank_option.id = select_list.id + ':blank'
        blank_option.value = ''
        blank_option.selected = true
        blank_option.disabled = true
        blank_option.hidden = true
        blank_option.innerHTML = 'Select';
        select_list.appendChild(blank_option)

        // Add options
        for (const other_sense of all_senses) {
            let option = document.createElement("option");
            option.id = select_list.id+":"+other_sense
            option.value = other_sense;
            option.text = other_sense;
            if (!literal_mixed_senses.has(other_sense)){
                // Hide
                option.disabled = true
                option.hidden = true
            }
            select_list.appendChild(option);
        }

        // Add it to the correct point
        let insert_point = document.getElementById(`dropdown_${sense}`);
        insert_point.innerHTML = ' It is similar to '
        insert_point.appendChild(select_list);
    }
}

function literal(sense)
{
    if (!literal_mixed_senses.has(sense)) {

        // Change colour
        let row = document.getElementById(sense)
        row.style.backgroundColor = 'yellow'
        row.style.color = 'black'

        // Reassign
        literal_mixed_senses.add(sense)
        metaphorical_senses.delete(sense)

        // Add it to the dropdown list options
        for (const met_sense of metaphorical_senses) {
            let option = document.getElementById(`select_${met_sense}:${sense}`)
            option.disabled = false
            option.hidden = false
        }

        // Remove the dropdown list and text box
        document.getElementById(`dropdown_${sense}`).innerHTML = '';
        document.getElementById(`similarity_${sense}`).innerHTML = ''
    }
}

function show_similarity(sense) {

    var select = document.getElementById("select_"+sense);
    if(select.selectedIndex <=0) {
        // Nothing selected
        document.getElementById(`similarity_${sense}`).innerHTML = ''
    } else {
        // Add text box
        let similarity = document.createElement('input')
        similarity.type = 'text'
        let insert_point = document.getElementById(`similarity_${sense}`)
        insert_point.innerHTML = ' because they both '
        insert_point.appendChild(similarity)
        insert_point.innerHTML += '.'
    }
}