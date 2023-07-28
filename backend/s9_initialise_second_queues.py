import random
from collections import defaultdict

from backend.common.common import open_pickle, info, safe_lemma_from_key, open_json, save_json
from backend.common.global_variables import lemmas_to_senses_py_file, QUEUE_LENGTH, MIN_SENSES, \
    MAX_SENSES, wiki_lemma_frequency_file, NUM_WORDS

rand = random.Random(10)

info('Loading')
lemmas_to_senses = open_pickle(lemmas_to_senses_py_file)

info(f'{len(lemmas_to_senses)} lemmas total')

info('Filtering monosemes')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if len(sense_ids) >= 2:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering derivationally related forms')

# Reformat frequencies
frequency_map_raw = open_pickle(wiki_lemma_frequency_file + '.pkl')
frequency_map = defaultdict(int)
simple_map = {
    'ADJ': 'adj',
    'ADP': 'func',
    'ADV': 'adv',
    'AUX': 'func',
    'CCONJ': 'func',
    'DET': 'func',
    # 'INTJ': 'interjection',
    'NOUN': 'noun',
    'NUM': 'noun',
    'PART': 'func',
    'PRON': 'func',
    'PROPN': 'noun',
    # 'PUNCT': 'punctuation',
    'SCONJ': 'func',
    # 'SYM': 'symbol',
    'VERB': 'verb'
    # 'X': 'other',
}
for (word, pos), count in frequency_map_raw.items():
    if pos in simple_map.keys():
        frequency_map[(word, simple_map[pos])] += count

senses_to_lemmas = {}
for lemma, senses in lemmas_to_senses.items():
    for sense in senses:
        assert sense not in senses_to_lemmas.keys()
        senses_to_lemmas[sense] = lemma

lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word, pos, index = lemma_id.split(':')

    if frequency_map[(word, pos)] == 0:
        continue

    # DFS to find all related lemma
    related_forms = set()
    sense_queue = list(sense_ids)
    seen_senses = set()
    while len(sense_queue) > 0:

        sense_id = sense_queue.pop()
        assert (sense_id not in seen_senses) and (sense_id not in sense_queue)

        # Add this form
        sense_obj = safe_lemma_from_key(word, sense_id)
        sense_key = sense_obj.key()
        if sense_key in senses_to_lemmas.keys():  # If it isn't it has already been filtered
            related_forms.add(senses_to_lemmas[sense_key])

        # Enqueue its decendents
        related_form_objs = sense_obj.derivationally_related_forms()
        for related_form_obj in related_form_objs:
            related_form_key = related_form_obj.key()
            if (related_form_key not in seen_senses) and (related_form_key not in sense_queue):
                sense_queue.append(related_form_key)

        seen_senses.add(sense_id)

    # Filter if any related form matches criteria
    skip = False
    for related_lemma in related_forms:
        if related_lemma == lemma_id:
            continue

        # Skip this lemma if a related lemma has more senses
        # if len(lemmas_to_senses[related_lemma]) > len(sense_ids):
        #     skip = True
        #     break
        # Skip this lemma if it is not the most frequent
        related_name, related_pos, _ = related_lemma.split(':')
        if frequency_map[(related_name, related_pos)] > frequency_map[(word, pos)]:
            skip = True
            break

    if not skip:
        lemmas_to_senses_filtered[lemma_id] = sense_ids

info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering proper nouns')
# Takes care of e.g. 'Macedonia'
# (lemmas where every sense is an instance hypernym)
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word = lemma_id.split(':')[0]

    # Check that at least one sense in not an instance_hypernym
    one_not_instance_hypernym = False
    one_lowercased = False
    for sense_id in sense_ids:
        wn_lemma = safe_lemma_from_key(word, sense_id)
        synset = wn_lemma.synset()
        instance_hypernyms = synset.instance_hypernyms()
        if len(instance_hypernyms) == 0:
            one_not_instance_hypernym = True
        form = wn_lemma.name()
        if form == form.lower():
            one_lowercased = True

        # Add it
        if one_lowercased and one_not_instance_hypernym:
            lemmas_to_senses_filtered[lemma_id] = sense_ids
            break

info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering single letter wordforms')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word = lemma_id.split(':')[0]
    if len(word) > 1:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

# WORD_LIST = set(read_text(whitelist_vocab_file))
# info(f"Filtering only {len(WORD_LIST)} whitelisted words")
# lemmas_to_senses_filtered = {}
# for lemma_id, sense_ids in lemmas_to_senses.items():
#     word = lemma_id.split(':')[0]
#     if word in WORD_LIST:
#         lemmas_to_senses_filtered[lemma_id] = sense_ids
# info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
# lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering wordforms with incorrect number of senses')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if MIN_SENSES <= len(sense_ids) <= MAX_SENSES:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering wordforms with hyphens or underscores')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if not ('_' in lemma_id or '-' in lemma_id):
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Splitting by POS')
pos_dict = defaultdict(list)
for lemma_id, sense_ids in lemmas_to_senses.items():
    wordform, pos, _ = lemma_id.split(':')
    freq = frequency_map[(wordform, pos)]
    pos_dict[pos].append((lemma_id, len(sense_ids), freq))

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')
all_noun_lemmas = pos_dict['noun']
lemmas = all_noun_lemmas  # list of (word, num_senses, freq)
info(f'{len(lemmas)} noun lemmas remain')

info('Filtering words done so far')
existing_queues = open_json('data/extracted/old_queues.json')

done_words = set()
for code_init in [':1', ':2', ':3']:
    for annotator in ['ojc42', 'wl399']:
        code = annotator + code_init
        for queue_id, queue in existing_queues.items():
            if code in queue_id:
                done_words.update(set(queue))

assert done_words.issubset({l for (l, n, f) in lemmas})
lemmas = [(l, n, f) for (l, n, f) in lemmas if l not in done_words]
info(f'{len(lemmas)} not annotated yet')

def weighted_sample_without_replacement(population, weights, k):
    v = [rand.random() ** (1 / w) for w in weights]
    order = sorted(range(len(population)), key=lambda i: v[i])
    return [population[i] for i in order[-k:]]


info('Building extra annotator queues')
NEW_ANNOTATOR_CODE = 'ehsh2'
new_anno_lemmas = weighted_sample_without_replacement(lemmas, weights=[l[2] for l in lemmas], k=1500)
lemmas = [l for l in lemmas if l not in new_anno_lemmas]
queue_dict = {}
rand.shuffle(new_anno_lemmas)
outer_index = 1
for (num_overall, num_overlapping) in NUM_WORDS:
    num_unique = num_overall - num_overlapping

    # Save overlapping
    overlaps_code = f'overlaps:{outer_index:01d}'
    overlapping = existing_queues[overlaps_code]
    overlapping = [(l, n, f) for (l, n, f) in all_noun_lemmas if l in overlapping]
    # add overlapping freqs

    annotation_set = overlapping + new_anno_lemmas[:num_unique]
    new_anno_lemmas = new_anno_lemmas[num_unique:]

    assert len(annotation_set) == num_overall
    rand.shuffle(annotation_set)

    inner_index = 1
    while len(annotation_set) > 0:
        queue_code = f"{NEW_ANNOTATOR_CODE}:{outer_index:01d}{inner_index:03d}"
        assert queue_code not in queue_dict.keys()

        queue = sorted(annotation_set[:QUEUE_LENGTH], key=lambda x: x[1])
        queue = [itm[0] for itm in queue]  # Strip the num of senses
        queue_dict[queue_code] = queue

        annotation_set = annotation_set[QUEUE_LENGTH:]
        inner_index += 1

    outer_index += 1

assert len(new_anno_lemmas) == 0

EXTRAS = {
    'ojc42': 100,
    'wl399': 100
}
num_extra_words = sum([v*QUEUE_LENGTH for v in EXTRAS.values()])
extra_lemmas = weighted_sample_without_replacement(lemmas, weights=[l[2] for l in lemmas], k=num_extra_words)
lemmas = [l for l in lemmas if l not in extra_lemmas]
rand.shuffle(extra_lemmas)

for annotator_code, num_queues in EXTRAS.items():
    num_words = num_queues * QUEUE_LENGTH
    annotation_set = extra_lemmas[:num_words]
    extra_lemmas = extra_lemmas[num_words:]

    inner_index = 1
    while len(annotation_set) > 0:
        queue_code = f"{annotator_code}:{outer_index:01d}{inner_index:03d}"
        assert queue_code not in queue_dict.keys()

        queue = sorted(annotation_set[:QUEUE_LENGTH], key=lambda x: x[1])
        queue = [itm[0] for itm in queue]  # Strip the num of senses
        queue_dict[queue_code] = queue

        annotation_set = annotation_set[QUEUE_LENGTH:]
        inner_index += 1

info('Saving')

filtered_existing_queues = {k: v for k, v in existing_queues.items() if ':4' not in k}
queues_combined = {}
for k, v in queue_dict.items():
    assert k not in queues_combined.keys()
    queues_combined[k] = v
for k, v in filtered_existing_queues.items():
    assert k not in queues_combined.keys()
    queues_combined[k] = v

save_json('data/extracted/new_queues.json', queue_dict)
save_json('data/extracted/old_queues_filtered.json', filtered_existing_queues)
save_json('data/extracted/queues.json', queues_combined)