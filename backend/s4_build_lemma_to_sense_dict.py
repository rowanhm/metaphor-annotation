from collections import defaultdict
from nltk.corpus import wordnet as wn

from backend.common.common import info, save_pickle, safe_lemma_from_key, read_text
from backend.common.global_variables import lemmas_to_senses_py_file, related_lemmas_file, pos_map, \
    whitelist_vocab_file, MIN_SENSES, MAX_SENSES

assert wn.get_version() == '3.0'

info('Extracting')
related_lemmas = defaultdict(set)  # word/index -> pos
lemmas_to_senses = defaultdict(set)
for synset in wn.all_synsets():
    pos = pos_map[synset.pos()]

    for word in synset.lemmas():
        sense_id = word.key()
        wordform = word.name()
        index = 1

        lemmas_to_senses[f'{wordform.lower()}:{pos}:{index}'].add(sense_id)
        related_lemmas[(wordform.lower(), str(index))].add(pos)

info('Filtering monosemes')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if len(sense_ids) >= 2:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering derivationally related forms')
senses_to_lemmas = {}
for lemma, senses in lemmas_to_senses.items():
    for sense in senses:
        assert sense not in senses_to_lemmas.keys()
        senses_to_lemmas[sense] = lemma
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word, pos, index = lemma_id.split(':')

    related_forms = set()
    for related_pos in related_lemmas[(word, index)]:
        if related_pos != pos:
            if f'{word}:{related_pos}:{index}' in lemmas_to_senses.keys():  # If it isn't it has already been filtered
                related_forms.add(f'{word}:{related_pos}:{index}')

    for sense_id in sense_ids:
        # Get sense object
        sense_obj = safe_lemma_from_key(word, sense_id)

        related_form_objs = sense_obj.derivationally_related_forms()
        for related_form_obj in related_form_objs:
            # Get the lemma it is a part of
            related_form_key = related_form_obj.key()
            if related_form_key in senses_to_lemmas.keys():  # If it isn't it has already been filtered
                related_forms.add(senses_to_lemmas[related_form_key])

    skip = False
    for related_lemma in related_forms:
        # Skip this lemma if a related lemma has more senses
        if len(lemmas_to_senses[related_lemma]) > len(sense_ids):
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

info('Filtering wordforms with incorrect number of senses')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if MIN_SENSES <= len(sense_ids) <= MAX_SENSES:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

WORD_LIST = set(read_text(whitelist_vocab_file))
info(f"Filtering only {len(WORD_LIST)} whitelisted words")
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word = lemma_id.split(':')[0]
    if word in WORD_LIST:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

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
save_pickle(related_lemmas_file, related_lemmas)
