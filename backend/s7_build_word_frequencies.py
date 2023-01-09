import json
import os
from collections import defaultdict
from nltk.tokenize import sent_tokenize

import spacy
import glob

from backend.common.common import read_text, info, save_csv, warn, flatten, save_pickle, save_json
from backend.common.global_variables import wiki_data_dir, wiki_lemma_frequency_file, wiki_token_frequency_file

#info('Setting GPU required')
#spacy.require_gpu()

model = "en_core_web_lg"
info(f'Loading {model}')
nlp = spacy.load(model)

lemma_counts = defaultdict(int)
token_counts = defaultdict(int)

info('Processing')


def get_text(wiki_json):
    return json.loads(wiki_json)["text"]
    # return wiki_json.split('"text": ')[-1][:-1]


i = 0
for file in glob.iglob(wiki_data_dir + '*/wiki_*'):

    if not os.path.isfile(file):
        warn(f'Not a file {file}')
        continue

    i += 1
    if i % 2 == 0:
        info(f'On file {i}...')
        #break

    # Extract the text
    lines = read_text(file)
    wiki_texts = [get_text(line) for line in lines]
    wiki_texts = [text for text in wiki_texts if text != '']
    wiki_texts = flatten([sent_tokenize(text) for text in wiki_texts])

    for doc in nlp.pipe(wiki_texts, disable=["pbarser", "ner"]):

        # for sent in doc.sents:
        for token in doc:
            token_string = token.text.lower()
            lemma = token.lemma_.lower()
            pos = token.pos_

            token_counts[(token_string, pos)] += 1
            lemma_counts[(lemma, pos)] += 1


def reformat_csv(counts):
    reformatted = [{'word': w, 'pos': p, 'count': c} for (w, p), c in counts.items()]
    return sorted(reformatted, key=lambda x: x["count"], reverse=True)


def reformat_json(counts):
    output = defaultdict(dict)
    for (word, pos), count in counts.items():
        output[word][pos] = count
    return output


info('Saving')
#lemma_counts[('\u2013', 'TEST')] = 17
#token_counts[('\u2013', 'TEST')] = 17

save_csv(wiki_lemma_frequency_file + '.tsv', reformat_csv(lemma_counts), encoding='utf-8')
save_csv(wiki_token_frequency_file + '.tsv', reformat_csv(token_counts), encoding='utf-8')

save_pickle(wiki_lemma_frequency_file + '.pkl', lemma_counts)
save_pickle(wiki_token_frequency_file + '.pkl', token_counts)

save_json(wiki_lemma_frequency_file + '.json', reformat_json(lemma_counts))
save_json(wiki_token_frequency_file + '.json', reformat_json(token_counts))
