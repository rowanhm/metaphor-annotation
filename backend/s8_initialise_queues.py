import json
import random
from collections import defaultdict

from backend.common.common import open_pickle, info, open_dict_csv, safe_lemma_from_key
from backend.common.global_variables import lemmas_to_senses_py_file, QUEUE_LENGTH, queues_js_file, MIN_SENSES, \
    MAX_SENSES, word_frequencies_file

rand = random.Random(99)

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

info('Filtering derivationally related forms and infrequent')
# Reformatting frequencies
frequency_data = open_dict_csv(word_frequencies_file)
frequency_map = defaultdict(int)
for entry in frequency_data:
    pos = entry['PoS']
    new_pos = None
    if pos == 'j':
        new_pos = 'adj'
    elif pos == 'n':
        new_pos = 'noun'
    elif pos == 'v':
        new_pos = 'verb'
    elif pos == 'r':
        new_pos = 'adv'
    if new_pos is not None:
        frequency_map[(entry['lemma'], new_pos)] += int(entry['freq'])

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
    pos = lemma_id.split(':')[1]
    pos_dict[pos].append((lemma_id, len(sense_ids)))

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')

info('Splitting')
queue_dict = {}

for pos, pos_lemmas in pos_dict.items():
    if pos == 'adv':
        continue
    lemmas_remaining = pos_lemmas
    rand.shuffle(lemmas_remaining)
    index = 1
    while len(lemmas_remaining) > 0:
        queue_code = f"{pos}{index:03d}"
        assert queue_code not in queue_dict.keys()

        queue = sorted(lemmas_remaining[:QUEUE_LENGTH], key=lambda x: x[1])
        queue = [lemma_id for (lemma_id, num_senses) in queue]  # Strip the num of senses
        queue_dict[queue_code] = queue

        lemmas_remaining = lemmas_remaining[QUEUE_LENGTH:]
        index += 1

info('Saving')
with open(queues_js_file, "w") as fp:
    json.dump(queue_dict, fp)
