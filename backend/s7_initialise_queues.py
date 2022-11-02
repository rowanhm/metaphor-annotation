import json
import random
from collections import defaultdict

from backend.common.common import open_pickle, info
from backend.common.global_variables import lemmas_to_senses_py_file, QUEUE_LENGTH, queues_js_file, MIN_SENSES, \
    MAX_SENSES

rand = random.Random(99)

info('Loading')
lemma_to_senses = open_pickle(lemmas_to_senses_py_file)
info(f'{len(lemma_to_senses)} lemmas total')

info('Filtering wordforms with incorrect number of senses')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemma_to_senses.items():
    if MIN_SENSES <= len(sense_ids) <= MAX_SENSES:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemma_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemma_to_senses = lemmas_to_senses_filtered

info('Splitting by POS')
pos_dict = defaultdict(list)
for lemma_id, sense_ids in lemma_to_senses.items():
    pos = lemma_id.split(':')[1]
    pos_dict[pos].append((lemma_id, len(sense_ids)))

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')

info('Splitting')
queue_dict = {}

for pos, pos_lemmas in pos_dict.items():
    if pos == 'adv':
        continue
    lemmas_remaining = pos_lemmas
    rand.shuffle(lemmas_remaining)
    index = 1
    while len(lemmas_remaining) > 0:
        queue_code = f"{pos}{index:03d}"
        assert queue_code not in queue_dict.keys()

        queue = sorted(lemmas_remaining[:QUEUE_LENGTH], key=lambda x: x[1])
        queue = [lemma_id for (lemma_id, num_senses) in queue]  # Strip the num of senses
        queue_dict[queue_code] = queue

        lemmas_remaining = lemmas_remaining[QUEUE_LENGTH:]
        index += 1

info('Saving')
with open(queues_js_file, "w") as fp:
    json.dump(queue_dict, fp)
