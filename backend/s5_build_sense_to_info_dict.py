from collections import defaultdict

from nltk.corpus import wordnet as wn
from backend.common.common import info, open_pickle, save_pickle
from backend.common.global_variables import example_sentences_file_princeton, senses_to_info_py_file

assert wn.get_version() == '3.0'

info('Loading examples')
examples = open_pickle(example_sentences_file_princeton)

info('Collating')
sense_to_info = {}

for synset in wn.all_synsets():
    concept_id = synset.name()
    synset_examples = examples[concept_id]

    for sense in synset.lemmas():
        sense_id = sense.key()

        if sense_id not in sense_to_info.keys():
            word = sense.name()
            assert sense.synset() == synset
            synonyms = [{"string": info.name(), "sense_id": info.key()} for info in synset.lemmas() if info.name() != word]

            # Find relevent examples
            relevent_examples = []
            for example in synset_examples:
                example_string = example.string
                if word.lower().replace('_', ' ') in example_string.lower():
                    relevent_examples.append(example_string)

            sense_to_info[sense_id] = {
                'examples': relevent_examples,
                'word': word,
                'synonyms': synonyms,
                'concept_id': concept_id
            }

info('Saving')
save_pickle(senses_to_info_py_file, sense_to_info)

