import json
import random
from collections import defaultdict

from backend.common.common import open_pickle, info, safe_lemma_from_key
from backend.common.global_variables import lemmas_to_senses_py_file, QUEUE_LENGTH, queues_js_file, MIN_SENSES, \
    MAX_SENSES, wiki_lemma_frequency_file, NUM_WORDS, ANNOTATOR_CODES

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

info('Splitting by POS')
pos_dict = defaultdict(list)
for lemma_id, sense_ids in lemmas_to_senses.items():
    wordform, pos, _ = lemma_id.split(':')
    freq = frequency_map[(wordform, pos)]
    pos_dict[pos].append((lemma_id, len(sense_ids), freq))

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')

NUM_ANNOTATORS = len(ANNOTATOR_CODES)
total_words = sum([((total-shared)*NUM_ANNOTATORS)+shared for total, shared in NUM_WORDS])
info(f'Sample most frequent {total_words} noun lemmas')
lemmas = pos_dict['noun']  # list of (word, num_senses, freq)


def weighted_sample_without_replacement(population, weights, k):
    v = [rand.random() ** (1 / w) for w in weights]
    order = sorted(range(len(population)), key=lambda i: v[i])
    return [population[i] for i in order[-k:]]


lemmas = weighted_sample_without_replacement(lemmas, weights=[l[2] for l in lemmas], k=total_words)


# counts = defaultdict(int)
# for _, num_senses, _ in lemmas:
#     counts[num_senses] += 1
# info(f'Counts: {counts}')

info('Splitting')
queue_dict = {}
rand.shuffle(lemmas)

outer_index = 1
for (num_overall, num_overlapping) in NUM_WORDS:
    num_unique = num_overall - num_overlapping

    overlapping = lemmas[:num_overlapping]
    lemmas = lemmas[num_overlapping:]

    by_annotator = {}
    for annotator_code in ANNOTATOR_CODES:
        by_annotator[annotator_code] = overlapping + lemmas[:num_unique]
        lemmas = lemmas[num_unique:]

    for annotator_code, annotation_set in by_annotator.items():
        assert len(annotation_set) == num_overall
        rand.shuffle(annotation_set)

        inner_index = 1
        while len(annotation_set) > 0:
            queue_code = f"{annotator_code}.{outer_index:01d}{inner_index:03d}"
            assert queue_code not in queue_dict.keys()

            queue = sorted(annotation_set[:QUEUE_LENGTH], key=lambda x: x[1])
            queue = [itm[0] for itm in queue]  # Strip the num of senses
            queue_dict[queue_code] = queue

            annotation_set = annotation_set[QUEUE_LENGTH:]
            inner_index += 1

    outer_index += 1

assert len(lemmas) == 0

info('Saving')
with open(queues_js_file, "w") as fp:
    json.dump(queue_dict, fp)