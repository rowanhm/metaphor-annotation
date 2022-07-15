# TODO add homograph info

# Extract wn definitions
from collections import defaultdict
from nltk.corpus import wordnet as wn

from backend.common.common import save_pickle, info, open_pickle
from backend.common.global_variables import lemmas_to_senses_py_file

pos_lookup = {
    'n': 'noun',
    'v': 'verb',
    'a': 'adj',
    's': 'adj',
    'r': 'adv'
}

info('Generating dictionary')
wn_dict = defaultdict(list)
word_pos_options = defaultdict(set)
all_lemma_ids = set()

# Build list of all lemmas
for synset in wn.all_synsets():

    # Attempt to filter Proper Nouns and phrases
    lemmas = {l for l in synset.lemmas() if (l.name().lower() == l.name() and '_' not in l.name())}
    if len(lemmas) == 0:
        continue

    for lemma in lemmas:
        sense_id = lemma.key()
        lemma_name = lemma.name()
        pos = pos_lookup[synset.pos()]

        assert sense_id not in all_lemma_ids
        all_lemma_ids.add(lemma_name)

        wn_dict[(lemma_name, pos)].append(sense_id)

        word_pos_options[lemma_name].add(pos)

info('Filtering monosemous words')
overall_num_senses = 0
filtered_num_senses = 0
for lemma, pos_options in word_pos_options.items():
    assert len(pos_options) > 0
    num_senses = 0
    for pos in pos_options:
        pos_senses = len(wn_dict[(lemma, pos)])
        assert pos_senses > 0
        num_senses += pos_senses

    overall_num_senses += num_senses

    if num_senses == 1:  # Monosemous
        filtered_num_senses += 1
        for pos in pos_options:
            del wn_dict[(lemma, pos)]

info(f'Filtered {filtered_num_senses}/{overall_num_senses} senses, leaving {overall_num_senses-filtered_num_senses}')

wn_dict_flat = {}
for (lemma, pos), senses in wn_dict.items():
    wn_dict_flat[lemma+':'+pos] = senses

info('Saving')
save_pickle(lemmas_to_senses_py_file, wn_dict_flat)

info('Done')
