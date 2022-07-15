import json

from backend.common.common import info, open_pickle
from backend.common.global_variables import lemmas_to_senses_py_file, lemmas_to_senses_js_file, \
    concepts_to_definitions_py_file, concepts_to_definitions_js_file, senses_to_info_py_file, senses_to_info_js_file

info('Loading')
lemma_to_senses = open_pickle(lemmas_to_senses_py_file)
concept_to_def = open_pickle(concepts_to_definitions_py_file)
sense_to_info = open_pickle(senses_to_info_py_file)

info('Checks')
# Check every sense and concept, in all the annotation, is accounted for in sense_to_info and concept_to_dict
for defn in concept_to_def.values():
    sense_ids = defn.get_all_senses()
    for sense_id in sense_ids:
        assert sense_id in sense_to_info.keys()
for sense_info in sense_to_info.values():
    assert sense_info['concept_id'] in concept_to_def.keys()
    for example in sense_info['examples']:
        sense_ids = defn.get_all_senses()
        for sense_id in sense_ids:
            assert sense_id in sense_to_info.keys()

info('Processing lemma to senses')
with open(lemmas_to_senses_js_file, "w") as fp:
    json.dump(lemma_to_senses, fp)

info('Processing concept to definition')
concept_to_def_flattened = {concept_id: defn.to_dict() for concept_id, defn in concept_to_def.items()}
with open(concepts_to_definitions_js_file, "w") as fp:
    json.dump(concept_to_def_flattened, fp)

info('Processing sense to info')
sense_to_info_flattened = {}
for sense_id, info in sense_to_info.items():
    info['examples'] = [ex.to_dict() for ex in info['examples']]
    sense_to_info_flattened[sense_id] = info
with open(senses_to_info_js_file, "w") as fp:
    json.dump(sense_to_info_flattened, fp)