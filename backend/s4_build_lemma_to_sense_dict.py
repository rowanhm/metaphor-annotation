from collections import defaultdict
from nltk.corpus import wordnet as wn

from backend.common.common import open_dict_csv, info, save_pickle, safe_lemma_from_key
from backend.common.global_variables import raw_data_dir, lemmas_to_senses_py_file, related_lemmas_file, pos_map

lemma_assignments = open_dict_csv(raw_data_dir + 'between_pos_clusters.csv')

info('Extracting')
related_lemmas = defaultdict(set)  # word/index -> pos
lemmas_to_senses = defaultdict(set)
for lemma_assignment in lemma_assignments:
    sense_id = lemma_assignment['wn_sense']
    lemma_id = lemma_assignment['lemma']

    # Recover POS and re-index
    assert lemma_id.count('.') == 1
    assert lemma_id.count(':') == 0
    word, index = lemma_id.split('.')
    pos = pos_map[safe_lemma_from_key(word, sense_id).synset().pos()]

    lemmas_to_senses[f'{word}:{pos}:{index}'].add(sense_id)
    related_lemmas[(word, index)].add(pos)

info('Filtering monosemes')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if len(sense_ids) >= 1:
        lemmas_to_senses_filtered[lemma_id] = sense_ids

info('Ordering')
lemmas_to_senses_ordered = {}
for lemma_id, sense_ids in lemmas_to_senses_filtered.items():
    word, pos, index = lemma_id.split(':')
    synsets = wn.synsets(word)
    # all_lemmas = []
    # for synset in synsets:
    #     all_lemmas += [lemma for lemma in synset.lemmas() if lemma.name().lower() == word]
    sense_ids_ordered = []
    for sense in wn.lemmas(word):
        sense_id = sense.key()
        if sense_id in sense_ids and sense_id not in sense_ids_ordered:
            sense_ids_ordered.append(sense_id)
    assert set(sense_ids_ordered) == sense_ids, f'{sense_ids_ordered} != {sense_ids}'
    assert len(sense_ids_ordered) == len(set(sense_ids_ordered))
    lemmas_to_senses_ordered[lemma_id] = sense_ids_ordered

info('Saving')
save_pickle(lemmas_to_senses_py_file, lemmas_to_senses_ordered)
save_pickle(related_lemmas_file, related_lemmas)
