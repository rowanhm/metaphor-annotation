import os
from glob import iglob

from PIL import Image
from nltk.corpus import wordnet as wn

from backend.common.common import info, warn
from backend.common.global_variables import image_dir, imagenet_dir

y_new = 100
assert wn.get_version() == '3.0'

os.makedirs(image_dir, exist_ok=True)

info('Iterating through every synset')
for i, synset_folder in enumerate(iglob(imagenet_dir + '*/')):

    if (i+1) % 10 == 0:
        info(f'On synset {i+1}')

    # Convert the name to nltk format
    synset_code = os.path.basename(os.path.normpath(synset_folder))
    pos = synset_code[0]
    offset = int(synset_code[1:])
    synset = wn.synset_from_pos_and_offset(pos, offset)
    synset_name = synset.name()  # TODO check

    if '/' in synset_name:
        warn(f'Malformed synset: {synset_name}')
        continue

    # Check image doesn't already exist
    output_file = f'{image_dir}{synset_name}.jpg'
    if os.path.exists(output_file):
        continue

    # Get a random image
    image_file = next(iglob(synset_folder + '*.JPEG'))

    # Open the image
    img = Image.open(image_file, mode='r')
    x_orig, y_orig = img.size
    x_new = int((y_new/y_orig)*x_orig)
    img_downscale = img.resize((x_new, y_new), Image.ANTIALIAS)

    img_downscale.save(output_file)

print('Done')
