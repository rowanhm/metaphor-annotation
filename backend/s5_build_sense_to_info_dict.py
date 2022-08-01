from collections import defaultdict

from nltk.corpus import wordnet as wn
from backend.common.common import info, open_pickle, save_pickle
from backend.common.global_variables import example_sentences_file_princeton, senses_to_info_py_file

info('Loading and indexing examples')
examples = open_pickle(example_sentences_file_princeton)
example_map = defaultdict(list)
for example in examples:
    sense_ids = example.get_all_senses()
    for sense_id in sense_ids:
        example_map[sense_id].append(example)

info('Collating')
sense_to_info = {}

for synset in wn.all_synsets():
    for sense in synset.lemmas():
        sense_id = sense.key()

        if sense_id not in sense_to_info.keys():
            word = sense.name()
            assert sense.synset() == synset
            concept_id = synset.name()
            synonyms = [{"string": info.name(), "sense_id": info.key()} for info in synset.lemmas() if info.name() != word]

            sense_to_info[sense_id] = {
                'examples': example_map[sense_id],
                'word': word,
                'synonyms': synonyms,
                'concept_id': concept_id
            }

info('Saving')
save_pickle(senses_to_info_py_file, sense_to_info)

