# Directories
imagenet_dir = '/anfs/bigdisc/rh635/imagenet/winter21_whole/'

root = './'
data_dir = root + 'data/'
source_dir = root + 'src/'
website_dir = source_dir + 'website/'
raw_data_dir = data_dir + 'raw/'
extracted_data_dir = data_dir + 'extracted/'

lemmas_to_senses_py_file = raw_data_dir + 'lemmas_to_senses.pkl'
word_frequencies_file = raw_data_dir + 'wordFrequency.csv'
concepts_to_definitions_py_file = raw_data_dir + 'concepts_to_definitions.pkl'
senses_to_info_py_file = raw_data_dir + 'senses_to_info.pkl'
concepts_to_img_py_file = raw_data_dir + 'concepts_to_images.pkl'
example_sentences_file_princeton = raw_data_dir + 'example_sentences_princeton.pkl'  # list of annotated_sentence
whitelist_vocab_file = raw_data_dir + 'google-10000-english-usa.txt'

lemmas_to_senses_js_file = extracted_data_dir + 'lemmas_to_senses.json'
concepts_to_definitions_js_file = extracted_data_dir + 'concepts_to_definitions.json'
senses_to_info_js_file = extracted_data_dir + 'senses_to_info.json'
concepts_to_img_js_file = extracted_data_dir + 'concepts_to_images.json'

lemmas_to_senses_dir = extracted_data_dir + 'lemmas_to_senses/'
concepts_to_definitions_dir = extracted_data_dir + 'concepts_to_definitions/'
senses_to_info_dir = extracted_data_dir + 'senses_to_info/'

queues_js_file = extracted_data_dir + 'queues.json'

image_dir = extracted_data_dir + 'images/'

wiki_data_dir = raw_data_dir + 'wiki_extracted/'
wiki_lemma_frequency_file = raw_data_dir + 'wiki_lemma_frequencies'
wiki_token_frequency_file = raw_data_dir + 'wiki_token_frequencies'

# Parameters
QUEUE_LENGTH = 10
MIN_SENSES = 2
MAX_SENSES = 10
NUM_WORDS = [(100, 20), (500, 40), (1000, 40), (500, 0)]  # (total, shared)
ANNOTATOR_CODES = ['bp458', 'ojc42']

pos_map = {
    'v': 'verb',
    'n': 'noun',
    'r': 'adv',
    'a': 'adj',
    's': 'adj'
}
pos_map_reverse = {
    'verb': {'v'},
    'noun': {'n'},
    'adv': {'r'},
    'adj': {'a', 's'}
}