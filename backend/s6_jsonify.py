import json

from backend.common.common import info, open_pickle
from backend.common.global_variables import lemmas_to_senses_py_file, lemmas_to_senses_js_file, \
    concepts_to_definitions_py_file, concepts_to_definitions_js_file, senses_to_info_py_file, senses_to_info_js_file, \
    lemmas_to_senses_dir, concepts_to_definitions_dir, senses_to_info_dir, extracted_data_dir, concepts_to_img_js_file, concepts_to_img_py_file


# def reindex(keys, category):
#     assert len(category) == 1
#
#     new_id_map = {}
#     num_figures = len(str(len(keys)))
#     format_string = f"{{:0{num_figures}d}}{category}"
#
#     for i, uid in enumerate(keys):
#         new_id_map[uid] = format_string.format(i)
#
#     return new_id_map
#
#
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
concept_to_img = open_pickle(concepts_to_img_py_file)

# info('Renaming to remove slashes and dots')
# sense_id_map = reindex(sense_to_info.keys(), 'S')
# concept_id_map = reindex(concept_to_def.keys(), 'C')
# lemma_id_map = reindex(lemma_to_senses.keys(), 'L')
#
# concept_to_def_renamed = {}
# for concept_id, definition in concept_to_def.items():
#     concept_id = concept_id_map[concept_id]
#     sense_anno_renamed = []
#     for (start, end, sense_id) in definition.senses:
#         sense_id = sense_id_map[sense_id]
#         sense_anno_renamed.append((start, end, sense_id))
#     definition.senses = sense_anno_renamed
#     concept_to_def_renamed[concept_id] = definition
#
# lemma_to_senses_renamed = {}
# for lemma_id, sense_ids in lemma_to_senses.items():
#     lemma_id = lemma_id_map[lemma_id]
#     sense_ids_renamed = []
#     for sense_id in sense_ids:
#         sense_id = sense_id_map[sense_id]
#         sense_ids_renamed.append(sense_id)
#     lemma_to_senses_renamed[lemma_id] = sense_ids_renamed
#
# sense_to_info_renamed = {}
# for sense_id, sense_info in sense_to_info.items():
#     sense_id = sense_id_map[sense_id]
#
#     concept_id = sense_info['concept_id']
#     concept_id = concept_id_map[concept_id]
#     sense_info['concept_id'] = concept_id
#
#     all_examples_renamed = []
#     for example in sense_info['examples']:
#         example = copy.deepcopy(example)
#         sense_anno_renamed = []
#         for (start, end, s_id) in example.senses:
#             s_id = sense_id_map[s_id]
#             sense_anno_renamed.append((start, end, s_id))
#         example.senses = sense_anno_renamed
#         all_examples_renamed.append(example)
#     sense_info['examples'] = all_examples_renamed
#
#     synonyms = sense_info['synonyms']
#     synonyms_renamed = []
#     for synonym in synonyms:
#         s_id = synonym['sense_id']
#         s_id = sense_id_map[s_id]
#         synonym['sense_id'] = s_id
#         synonyms_renamed.append(synonym)
#     sense_info['synonyms'] = synonyms_renamed
#
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

# info('Saving maps')
# with open(extracted_data_dir+'sense_id_map.json', "w") as fp:
#     json.dump(sense_id_map, fp)
# with open(extracted_data_dir+'concept_id_map.json', "w") as fp:
#     json.dump(concept_id_map, fp)
# with open(extracted_data_dir+'lemma_id_map.json', "w") as fp:
#     json.dump(lemma_id_map, fp)

info('Processing lemma to senses')
with open(lemmas_to_senses_js_file, "w") as fp:
    json.dump(lemma_to_senses, fp)
# save_json_per_item(lemma_to_senses, lemmas_to_senses_dir, depth=1)

info('Processing concept to definition/image')
concept_to_def_flattened = {concept_id: defn.to_dict() for concept_id, defn in concept_to_def.items()}
with open(concepts_to_definitions_js_file, "w") as fp:
    json.dump(concept_to_def_flattened, fp)
# save_json_per_item(concept_to_def_flattened, concepts_to_definitions_dir, depth=2)
with open(concepts_to_img_js_file, "w") as fp:
    json.dump(concept_to_img, fp)

info('Processing sense to info')
sense_to_info_flattened = {}
for sense_id, sense_info in sense_to_info.items():
    sense_to_info_flattened[sense_id] = sense_info
with open(senses_to_info_js_file, "w") as fp:
    json.dump(sense_to_info_flattened, fp)
# save_json_per_item(sense_to_info_flattened, senses_to_info_dir, depth=2)