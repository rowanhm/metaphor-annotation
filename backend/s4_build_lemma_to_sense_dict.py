from collections import defaultdict
from nltk.corpus import wordnet as wn

from backend.common.common import info, save_pickle, safe_lemma_from_key, open_dict_csv
from backend.common.global_variables import lemmas_to_senses_py_file, pos_map, word_frequencies_file

assert wn.get_version() == '3.0'

info('Extracting')
lemmas_to_senses = defaultdict(set)
for synset in wn.all_synsets():
    pos = pos_map[synset.pos()]

    for word in synset.lemmas():
        sense_id = word.key()
        wordform = word.name()
        index = 1

        lemmas_to_senses[f'{wordform.lower()}:{pos}:{index}'].add(sense_id)

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

info('Ordering')
lemmas_to_senses_ordered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    wordform, pos, index = lemma_id.split(':')
    synsets = wn.synsets(wordform)
    sense_ids_ordered = []
    for sense in wn.lemmas(wordform):
        sense_id = sense.key()
        if sense_id in sense_ids and sense_id not in sense_ids_ordered:
            sense_ids_ordered.append(sense_id)
    assert set(sense_ids_ordered) == sense_ids, f'{sense_ids_ordered} != {sense_ids}'
    assert len(sense_ids_ordered) == len(set(sense_ids_ordered))
    lemmas_to_senses_ordered[lemma_id] = sense_ids_ordered

info('Saving')
save_pickle(lemmas_to_senses_py_file, lemmas_to_senses_ordered)
