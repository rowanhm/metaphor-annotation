from collections import defaultdict

from backend.common.common import open_json, info, warn, save_json

import random
from collections import defaultdict

from backend.common.common import open_pickle, info, safe_lemma_from_key
from backend.common.global_variables import MIN_SENSES, \
    MAX_SENSES, wiki_lemma_frequency_file, NUM_WORDS, QUEUE_LENGTH

rand = random.Random(10)


info('Loading')
raw_done_queues = open_json('data/raw/annotated_words.json')
old_queues = open_json('data/extracted/queues_with_sample_issue.json')
lemmas_to_senses = open_json('data/extracted/lemmas_to_senses.json')

info('Finding remaining queues')
done_queues = defaultdict(list)
remaining_queues = defaultdict(list)
for username, done in raw_done_queues.items():
    for queue_id, words in old_queues.items():
        if queue_id in done.keys():
            if len(words) != len(done[queue_id]):
                warn(f'{username}, {queue_id} incomplete')
            if username in queue_id and 'redo' not in queue_id:
                done_queues[username].append(queue_id)
        else:
            if username in queue_id and 'redo' not in queue_id:
                remaining_queues[username].append(queue_id)

for username, remaining in remaining_queues.items():
    info(f'{username}: {len(remaining)} remain; {len(done_queues[username])} done')

nums_to_resample = {usr: len(queues)*QUEUE_LENGTH for usr, queues in remaining_queues.items()}
nums_to_resample['ehsh2'] -= len(old_queues['overlaps:3'])  # Factor in overlaps
total_num_to_resample = sum(nums_to_resample.values())
info(f'Resampling {total_num_to_resample}')

def count_senses(username, start_with):
    output = defaultdict(int)
    for queue_id in done_queues[username]:
        if ':' not in queue_id:
            continue
        usr, queue_num = queue_id.split(':')
        if usr == username and queue_num[0] in start_with:
            for lemma in old_queues[queue_id]:
                output[len(lemmas_to_senses[lemma])] += 1
    return output


def get_mean(distribution):
    return sum([num_senses*count for num_senses, count in distribution.items()]) / sum([count for count in distribution.values()])

info('Finding target dist')
ojc42_target_dist = count_senses('ojc42', {'1', '2', '3'})
wl399_target_dist = count_senses('wl399', {'1', '2', '3'})
assert sum(ojc42_target_dist.values()) == sum(wl399_target_dist.values()) == 1600

#target_dist = {num: count + wl399_target_dist[num] for num, count in ojc42_target_dist.items()}
#assert sum(target_dist.values()) == 3200
target_dist = ojc42_target_dist

info(f'Target distribution: {[target_dist[num] for num in range(2, 11)]} (mean {get_mean(target_dist)})')

dists_so_far = {
    'ojc42': count_senses('ojc42', {'4'}),
    'ehsh2': count_senses('ehsh2', {'1', '2'}),
    'wl399': {}
}

info('Computing target distributions')
lengths = list(range(2, 11))
weights = [target_dist[i] for i in lengths]
usr_target_dists = {}
for username, dist_to_far in dists_so_far.items():
    num_words_remaining = nums_to_resample[username]

    total_words = sum(dist_to_far.values()) + num_words_remaining
    usr_targets = rand.choices(population=lengths, weights=weights, k=total_words)
    usr_target_dist = defaultdict(int)
    for length in usr_targets:
        usr_target_dist[length] += 1

    assert sum(usr_target_dist.values()) == total_words

    # Subtract off those done so far
    for num, count in dist_to_far.items():
        assert count <= usr_target_dist[num]
        usr_target_dist[num] -= count

    assert sum(usr_target_dist.values()) == num_words_remaining

    usr_target_dists[username] = usr_target_dist

for usr, targets in usr_target_dists.items():
    info(f'{usr} remaining target distribution: {[targets[num] for num in range(2, 11)]} (mean {get_mean(targets)})')

info('Filtering monosemes')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if len(sense_ids) >= 2:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering derivationally related forms')

# Reformat frequencies
frequency_map_raw = open_pickle(wiki_lemma_frequency_file + '.pkl')
frequency_map = defaultdict(int)
simple_map = {
    'ADJ': 'adj',
    'ADP': 'func',
    'ADV': 'adv',
    'AUX': 'func',
    'CCONJ': 'func',
    'DET': 'func',
    # 'INTJ': 'interjection',
    'NOUN': 'noun',
    'NUM': 'noun',
    'PART': 'func',
    'PRON': 'func',
    'PROPN': 'noun',
    # 'PUNCT': 'punctuation',
    'SCONJ': 'func',
    # 'SYM': 'symbol',
    'VERB': 'verb'
    # 'X': 'other',
}
for (word, pos), count in frequency_map_raw.items():
    if pos in simple_map.keys():
        frequency_map[(word, simple_map[pos])] += count

senses_to_lemmas = {}
for lemma, senses in lemmas_to_senses.items():
    for sense in senses:
        assert sense not in senses_to_lemmas.keys()
        senses_to_lemmas[sense] = lemma

lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word, pos, index = lemma_id.split(':')

    if frequency_map[(word, pos)] == 0:
        continue

    # DFS to find all related lemma
    related_forms = set()
    sense_queue = list(sense_ids)
    seen_senses = set()
    while len(sense_queue) > 0:

        sense_id = sense_queue.pop()
        assert (sense_id not in seen_senses) and (sense_id not in sense_queue)

        # Add this form
        sense_obj = safe_lemma_from_key(word, sense_id)
        sense_key = sense_obj.key()
        if sense_key in senses_to_lemmas.keys():  # If it isn't it has already been filtered
            related_forms.add(senses_to_lemmas[sense_key])

        # Enqueue its decendents
        related_form_objs = sense_obj.derivationally_related_forms()
        for related_form_obj in related_form_objs:
            related_form_key = related_form_obj.key()
            if (related_form_key not in seen_senses) and (related_form_key not in sense_queue):
                sense_queue.append(related_form_key)

        seen_senses.add(sense_id)

    # Filter if any related form matches criteria
    skip = False
    for related_lemma in related_forms:
        if related_lemma == lemma_id:
            continue

        # Skip this lemma if a related lemma has more senses
        # if len(lemmas_to_senses[related_lemma]) > len(sense_ids):
        #     skip = True
        #     break
        # Skip this lemma if it is not the most frequent
        related_name, related_pos, _ = related_lemma.split(':')
        if frequency_map[(related_name, related_pos)] > frequency_map[(word, pos)]:
            skip = True
            break

    if not skip:
        lemmas_to_senses_filtered[lemma_id] = sense_ids

info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
warn('SKIPPING DERIVATIONAL FILTER')

info('Filtering proper nouns')
# Takes care of e.g. 'Macedonia'
# (lemmas where every sense is an instance hypernym)
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word = lemma_id.split(':')[0]

    # Check that at least one sense in not an instance_hypernym
    one_not_instance_hypernym = False
    one_lowercased = False
    for sense_id in sense_ids:
        wn_lemma = safe_lemma_from_key(word, sense_id)
        synset = wn_lemma.synset()
        instance_hypernyms = synset.instance_hypernyms()
        if len(instance_hypernyms) == 0:
            one_not_instance_hypernym = True
        form = wn_lemma.name()
        if form == form.lower():
            one_lowercased = True

        # Add it
        if one_lowercased and one_not_instance_hypernym:
            lemmas_to_senses_filtered[lemma_id] = sense_ids
            break

info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering single letter wordforms')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    word = lemma_id.split(':')[0]
    if len(word) > 1:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

# WORD_LIST = set(read_text(whitelist_vocab_file))
# info(f"Filtering only {len(WORD_LIST)} whitelisted words")
# lemmas_to_senses_filtered = {}
# for lemma_id, sense_ids in lemmas_to_senses.items():
#     word = lemma_id.split(':')[0]
#     if word in WORD_LIST:
#         lemmas_to_senses_filtered[lemma_id] = sense_ids
# info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
# lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering wordforms with incorrect number of senses')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if MIN_SENSES <= len(sense_ids) <= MAX_SENSES:
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering wordforms with hyphens or underscores')
lemmas_to_senses_filtered = {}
for lemma_id, sense_ids in lemmas_to_senses.items():
    if not ('_' in lemma_id or '-' in lemma_id):
        lemmas_to_senses_filtered[lemma_id] = sense_ids
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Filtering wordforms missing frequency data')
lemmas_to_senses_filtered = {}
for lemma, senses in lemmas_to_senses.items():
    wordform, pos, ind = lemma.split(':')
    if (wordform, pos) in frequency_map.keys():
        if frequency_map[(wordform, pos)] > 0:
            lemmas_to_senses_filtered[lemma] = senses
info(f'{len(lemmas_to_senses)} -> {len(lemmas_to_senses_filtered)} lemmas')
lemmas_to_senses = lemmas_to_senses_filtered

info('Splitting by POS')
pos_dict = defaultdict(list)
for lemma_id, sense_ids in lemmas_to_senses.items():
    wordform, pos, _ = lemma_id.split(':')
    freq = frequency_map[(wordform, pos)]
    pos_dict[pos].append((lemma_id, len(sense_ids), freq))

info(f'POS breakdown: {[(pos, len(lemmas)) for pos, lemmas in pos_dict.items()]}')
all_noun_lemmas = pos_dict['noun']
lemmas = all_noun_lemmas  # list of (word, num_senses, freq)
info(f'{len(lemmas)} noun lemmas remain')

info('Filtering words done so far')
done_words = set()
for user_id, queues in done_queues.items():
    for queue in queues:
        words = old_queues[queue]
        done_words.update(set(words))

assert done_words.issubset({l for (l, n, f) in lemmas})
lemmas = [(l, n, f) for (l, n, f) in lemmas if l not in done_words]
info(f'{len(lemmas)} not annotated yet')

info('Checking all words initially meant to be there are in, and those done are not')
lem_set = {l[0] for l in lemmas}
assert len(lem_set) == len(lemmas)
assert len(done_words.intersection(lem_set)) == 0  # No done words there
for usr, queues in remaining_queues.items():
    for queue_id in queues:
        assert {l for l in old_queues[queue_id] if l not in old_queues['overlaps:3']}.union(lem_set) == lem_set


totals_to_sample_by_length = {num: sum([v[num] for v in usr_target_dists.values()]) for num in lengths}
assert sum(totals_to_sample_by_length.values()) == total_num_to_resample

num_lemmas_by_length = {}
for length, count in totals_to_sample_by_length.items():
    length_lemmas = [l for l in lemmas if l[1] == length]
    info(f'{len(length_lemmas)} lemmas of length {length} available')
    num_lemmas_by_length[length] = len(length_lemmas)

info('Targets before recalbration')
info(f'Target distribution: {[totals_to_sample_by_length[num] for num in lengths]} (mean {get_mean(totals_to_sample_by_length)})')
for usr, targets in usr_target_dists.items():
    info(f'{usr} remaining target distribution: {[targets[num] for num in lengths]} (mean {get_mean(targets)})')


info(f'Recalibrating sample targets')
users, weights = zip(*[(usr, sum(counts_by_len.values())) for usr, counts_by_len in usr_target_dists.items()])

for recalib_length in sorted(lengths, reverse=True):

    num_available = num_lemmas_by_length[recalib_length]
    num_required = sum([v[recalib_length] for v in usr_target_dists.values()])

    while num_required > num_available:
        user = rand.choices(population=users, weights=weights, k=1)[0]

        target_length = recalib_length - 1
        while not (totals_to_sample_by_length[target_length] < num_lemmas_by_length[target_length]):  # Needs to be at least one available
            target_length -= 1
            assert target_length >= 2

        usr_target_dists[user][recalib_length] -= 1
        usr_target_dists[user][target_length] += 1
        totals_to_sample_by_length[recalib_length] -= 1
        totals_to_sample_by_length[target_length] += 1

        delta = recalib_length - target_length

        while delta > 0:
            options = []
            for lower_length in range(2, 8):
                if totals_to_sample_by_length[lower_length+1] < num_lemmas_by_length[lower_length+1]:
                    options.append((lower_length, lower_length+1))
                if totals_to_sample_by_length[lower_length+2] < num_lemmas_by_length[lower_length+2]:
                    options.append((lower_length, lower_length+2))
                if totals_to_sample_by_length[lower_length+3] < num_lemmas_by_length[lower_length+3]:
                    options.append((lower_length, lower_length+3))
            lower_length, lower_length_2 = rand.choice(options)

            usr_target_dists[user][lower_length] -= 1
            usr_target_dists[user][lower_length_2] += 1
            totals_to_sample_by_length[lower_length] -= 1
            totals_to_sample_by_length[lower_length_2] += 1
            delta -= 1

        assert num_required == sum([v[recalib_length] for v in usr_target_dists.values()]) + 1
        num_required -= 1

info('Sanity checking')
for num, count in totals_to_sample_by_length.items():
    assert count == sum([val[num] for val in usr_target_dists.values()])
for user, counts_by_len in usr_target_dists.items():
    assert sum(counts_by_len.values()) == nums_to_resample[user]

info(f'New target distribution: {[totals_to_sample_by_length[num] for num in lengths]} (mean {get_mean(totals_to_sample_by_length)})')
for usr, targets in usr_target_dists.items():
    info(f'{usr} new remaining target distribution: {[targets[num] for num in lengths]} (mean {get_mean(targets)})')


def weighted_sample_without_replacement(population, weights, k):
    v = [rand.random() ** (1 / w) for w in weights]
    order = sorted(range(len(population)), key=lambda i: v[i])
    return [population[i] for i in order[-k:]]


info(f'Sampling {total_num_to_resample} from pool of {len(lemmas)} ({[totals_to_sample_by_length[num] for num in lengths]})')
new_lemmas_by_length = {}
remaining_lemmas = []
for length, count in totals_to_sample_by_length.items():
    length_lemmas = [l for l in lemmas if l[1] == length]
    info(f'Sampling {count} of length {length} from pool of {len(length_lemmas)} ({100*count/len(length_lemmas):.2f}%)')
    assert len(length_lemmas) >= count
    new_anno_lemmas = weighted_sample_without_replacement(length_lemmas, weights=[l[2] for l in length_lemmas], k=count)
    new_lemmas_by_length[length] = new_anno_lemmas
    remaining_lemmas.extend([l for l in length_lemmas if l not in new_anno_lemmas])

info('Checking distribution')
new_anno_lemmas_only = []
for lems in new_lemmas_by_length.values():
    new_anno_lemmas_only.extend([l[0] for l in lems])
assert len(new_anno_lemmas_only) == len(set(new_anno_lemmas_only))
info(f'{len(new_anno_lemmas_only)} lemmas sampled (target {total_num_to_resample}), leaving {len(remaining_lemmas)}')
new_dist = defaultdict(int)
for lemma in new_anno_lemmas_only:
    num_senses = len(lemmas_to_senses[lemma])
    new_dist[num_senses] += 1
info(f'Sampled lemma dist {[new_dist[num] for num in lengths]} (mean {get_mean(new_dist)}')

info('Splitting between users')
lemmas_by_user = defaultdict(list)
for length, length_lemmas in new_lemmas_by_length.items():
    for user, counts_by_length in usr_target_dists.items():
        num_needed = counts_by_length[length]
        user_lemmas = length_lemmas[:num_needed]
        assert len(user_lemmas) == num_needed
        lemmas_by_user[user].extend(user_lemmas)
        length_lemmas = length_lemmas[num_needed:]
    assert len(length_lemmas) == 0

info('Adding overlaps')
lemmas_by_user['ehsh2'].extend([(w, len(lemmas_to_senses[w]), None) for w in old_queues['overlaps:3']])
for user, user_lemmas in lemmas_by_user.items():
    assert len(user_lemmas) == QUEUE_LENGTH * len(remaining_queues[user])

info('Splitting into queues')
new_output_queues = {}
for user, rem_queues in remaining_queues.items():
    user_lemmas = lemmas_by_user[user]
    rand.shuffle(user_lemmas)
    for queue_id in rem_queues:
        assert queue_id not in new_output_queues.keys()

        queue = sorted(user_lemmas[:QUEUE_LENGTH], key=lambda x: x[1])
        assert len(queue) == QUEUE_LENGTH
        new_output_queues[queue_id] = [itm[0] for itm in queue]         # Strip the num of senses

        user_lemmas = user_lemmas[QUEUE_LENGTH:]
    assert len(user_lemmas) == 0

info('Remerging with old queues')
assert old_queues == open_json('data/extracted/queues_with_sample_issue.json')
for queue_id, queue in new_output_queues.items():
    old_queues[queue_id] = queue

info('Adding remaining')
remaining_lemmas.sort(key=lambda x: x[2], reverse=True)
assert 'remaining' not in old_queues.keys()
old_queues['remaining'] = [itm[0] for itm in remaining_lemmas]

info(f'{len(old_queues)} queues (expected 3 overlaps, screener, tutorial, remaining, 160 ehsh2, 270, others = 706')
info('Saving')
save_json('data/extracted/queues.json', old_queues)