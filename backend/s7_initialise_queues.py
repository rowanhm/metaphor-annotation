# TODO add known ones, to evaluate each annotator
# TODO control for number of senses
import json
from collections import defaultdict

from backend.common.common import open_pickle, info, read_text, safe_lemma_from_key
from backend.common.global_variables import lemmas_to_senses_py_file, MIN_SENSES, MAX_SENSES, QUEUE_LENGTH, \
    queues_js_file, whitelist_vocab_file, related_lemmas_file

info('Loading')
WORD_LIST = set(read_text(whitelist_vocab_file))
info(f"{len(WORD_LIST)} whitelisted words")
lemma_to_senses = open_pickle(lemmas_to_senses_py_file)
info(f'{len(lemma_to_senses)} lemmas total')
related_lemmas = open_pickle(related_lemmas_file)

senses_to_lemmas = {}
for lemma, senses in lemma_to_senses.items():
    for sense in senses:
        assert sense not in senses_to_lemmas.keys()
        senses_to_lemmas[sense] = lemma

info('Filtering')
lemmas_matching_criteria = set()

excluded_word_list = 0
excluded_sense_count = 0
excluded_word_length = 0
excluded_derivation = 0

for lemma_id, senses in lemma_to_senses.items():
    word, pos, ind = lemma_id.split(':')

    if word not in WORD_LIST:
        excluded_word_list += 1
        continue

    if not (MIN_SENSES <= len(senses) <= MAX_SENSES):
        excluded_sense_count += 1
        continue

    if len(word) <= 1:
        excluded_word_length += 1
        continue

    # Check related forms
    related_forms = set()

    # Add ones with same form
    for related_pos in related_lemmas[(word, ind)]:
        if related_pos != pos:
            related_forms.add(f'{word}:{related_pos}:{ind}')

    # Check derivationally related
    for sense_id in senses:

        # Get sense object
        sense_obj = safe_lemma_from_key(word, sense_id)

        related_form_objs = sense_obj.derivationally_related_forms()
        for related_form_obj in related_form_objs:
            # Get the lemma it is a part of
            related_form_key = related_form_obj.key()
            if related_form_key in senses_to_lemmas.keys():  # If it isn't it has only one sense
                related_forms.add(senses_to_lemmas[related_form_key])

    skip = False
    for related_lemma in related_forms:
        # Skip this lemma if a related lemma has more senses
        if len(lemma_to_senses[related_lemma]) > len(senses):
            skip = True
            break

    if not skip:
        lemmas_matching_criteria.add(lemma_id)
    else:
        excluded_derivation += 1

info(f'{len(lemmas_matching_criteria)} lemmas match criteria (skippages: {excluded_word_list} as missing from whitelist; {excluded_sense_count} for wrong number of senses; {excluded_word_length} for too short form; {excluded_derivation} because of derivation)')

info('Splitting by POS')
pos_dict = defaultdict(set)
for lemma_id in lemmas_matching_criteria:
    pos = lemma_id.split(':')[1]
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
