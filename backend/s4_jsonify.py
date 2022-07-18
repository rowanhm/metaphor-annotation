import json
import os

from backend.common.common import info, open_pickle
from backend.common.global_variables import lemmas_to_senses_py_file, lemmas_to_senses_js_file, \
    concepts_to_definitions_py_file, concepts_to_definitions_js_file, senses_to_info_py_file, senses_to_info_js_file, \
    lemmas_to_senses_dir, concepts_to_definitions_dir, senses_to_info_dir


# def save_json_per_item(dictionary, directory, depth=0):
#     os.makedirs(directory, exist_ok=True)
#     for key, value in dictionary.items():
#         filename = f'{key}.json'
#         for d in reversed(range(depth)):
#             filename = filename[:d+1] + '/' + filename[d+1:]
#         filename = directory+filename
#         os.makedirs(os.path.dirname(filename), exist_ok=True)
#         with open(filename, "w") as fp:
#             json.dump(value, fp)


info('Loading')
lemma_to_senses = open_pickle(lemmas_to_senses_py_file)
concept_to_def = open_pickle(concepts_to_definitions_py_file)
sense_to_info = open_pickle(senses_to_info_py_file)

# info('Renaming to remove slashes and dots')
# concept_to_def_renamed = {}
# for concept_id, definition in concept_to_def.items():
#     concept_id = concept_id.replace('.', ':')
#     if '/' in concept_id:
#         concept_id = concept_id.replace('/', '_')
#         assert concept_id not in concept_to_def.keys()
#     sense_anno_renamed = []
#     for (start, end, sense_id) in definition.senses:
#         if '/' in sense_id:
#             sense_id = sense_id.replace('/', '_')
#             assert sense_id not in sense_to_info.keys()
#         sense_anno_renamed.append((start, end, sense_id))
#     definition.senses = sense_anno_renamed
#     concept_to_def_renamed[concept_id] = definition
# lemma_to_senses_renamed = {}
#
# for lemma_id, sense_ids in lemma_to_senses.items():
#     sense_ids_renamed = []
#     for sense_id in sense_ids:
#         if '/' in sense_id:
#             sense_id = sense_id.replace('/', '_')
#             assert sense_id not in sense_to_info.keys()
#         sense_ids_renamed.append(sense_id)
#     lemma_to_senses_renamed[lemma_id] = sense_ids_renamed
#
# sense_to_info_renamed = {}
# for sense_id, sense_info in sense_to_info.items():
#     if '/' in sense_id:
#         sense_id = sense_id.replace('/', '_')
#         assert sense_id not in sense_to_info.keys()
#     concept_id = sense_info['concept_id']
#     concept_id = concept_id.replace('.', ':')
#     if '/' in concept_id:
#         concept_id = sense_info['concept_id'].replace('/', '_')
#         assert concept_id not in concept_to_def.keys()
#     sense_info['concept_id'] = concept_id
#     all_examples_renamed = []
#     for example in sense_info['examples']:
#         sense_anno_renamed = []
#         for (start, end, s_id) in example.senses:
#             if '/' in s_id:
#                 s_id = s_id.replace('/', '_')
#                 assert s_id not in sense_to_info.keys()
#             sense_anno_renamed.append((start, end, s_id))
#         example.senses = sense_anno_renamed
#         all_examples_renamed.append(example)
#     sense_info['examples'] = all_examples_renamed
#     sense_to_info_renamed[sense_id] = sense_info
#
# assert len(lemma_to_senses) == len(lemma_to_senses_renamed)
# lemma_to_senses = lemma_to_senses_renamed
# assert len(concept_to_def) == len(concept_to_def_renamed)
# concept_to_def = concept_to_def_renamed
# assert len(sense_to_info) == len(sense_to_info_renamed)
# sense_to_info = sense_to_info_renamed

info('Checks')
# Check every sense and concept, in all the annotation, is accounted for in sense_to_info and concept_to_dict
for defn in concept_to_def.values():
    sense_ids = defn.get_all_senses()
    for sense_id in sense_ids:
        assert sense_id in sense_to_info.keys(), sense_id
for sense_info in sense_to_info.values():
    assert sense_info['concept_id'] in concept_to_def.keys()
    for example in sense_info['examples']:
        sense_ids = defn.get_all_senses()
        for sense_id in sense_ids:
            assert sense_id in sense_to_info.keys()
for sense_ids in lemma_to_senses.values():
    for sense_id in sense_ids:
        assert sense_id in sense_to_info.keys()

info('Processing lemma to senses')
with open(lemmas_to_senses_js_file, "w") as fp:
    json.dump(lemma_to_senses, fp)
# save_json_per_item(lemma_to_senses, lemmas_to_senses_dir, depth=2)

info('Processing concept to definition')
concept_to_def_flattened = {concept_id: defn.to_dict() for concept_id, defn in concept_to_def.items()}
with open(concepts_to_definitions_js_file, "w") as fp:
    json.dump(concept_to_def_flattened, fp)
# save_json_per_item(concept_to_def_flattened, concepts_to_definitions_dir, depth=2)

info('Processing sense to info')
sense_to_info_flattened = {}
for sense_id, info in sense_to_info.items():
    info['examples'] = [ex.to_dict() for ex in info['examples']]
    sense_to_info_flattened[sense_id] = info
with open(senses_to_info_js_file, "w") as fp:
    json.dump(sense_to_info_flattened, fp)
# save_json_per_item(sense_to_info_flattened, senses_to_info_dir, depth=4)
