# TODO add known ones, to evaluate each annotator
import json
from collections import defaultdict

from backend.common.common import open_pickle, info
from backend.common.global_variables import lemmas_to_senses_py_file, MIN_SENSES, MAX_SENSES, QUEUE_LENGTH, \
    queues_js_file

info('Loading')
lemma_to_senses = open_pickle(lemmas_to_senses_py_file)
info(f'{len(lemma_to_senses)} lemmas total')

info('Filtering')
lemmas_matching_criteria = set()
for lemma_id, senses in lemma_to_senses.items():
    if MIN_SENSES <= len(senses) <= MAX_SENSES:
        lemmas_matching_criteria.add(lemma_id)

info(f'{len(lemmas_matching_criteria)} lemmas match criteria')

info('Splitting by POS')
pos_dict = defaultdict(set)
for lemma_id in lemmas_matching_criteria:
    pos = lemma_id.split('.')[1]
    pos_dict[pos].add(lemma_id)

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')

info('Splitting')
queue_dict = {}

for pos, pos_lemmas in pos_dict.items():
    if pos == 'adv':
        continue
    lemmas_remaining = list(pos_lemmas)
    index = 1
    while len(lemmas_remaining) > 0:
        queue_code = f"{pos}{index:03d}"
        assert queue_code not in queue_dict.keys()

        queue = lemmas_remaining[:QUEUE_LENGTH]
        queue_dict[queue_code] = queue

        lemmas_remaining = lemmas_remaining[QUEUE_LENGTH:]
        index += 1

info('Saving')
with open(queues_js_file, "w") as fp:
    json.dump(queue_dict, fp)


