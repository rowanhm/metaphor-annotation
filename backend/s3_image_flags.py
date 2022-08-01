import os

from backend.common.common import save_pickle, open_pickle
from backend.common.global_variables import image_dir, concepts_to_img_py_file, concepts_to_definitions_py_file

concept_to_image_flags = {}
concepts = open_pickle(concepts_to_definitions_py_file).keys()

for synset_name in concepts:
    image_exists = False

    output_file = f'{image_dir}{synset_name}.jpg'
    if os.path.exists(output_file):
        image_exists = True

    concept_to_image_flags[synset_name] = image_exists

save_pickle(concepts_to_img_py_file, concept_to_image_flags)