# Directories
imagenet_dir = '/anfs/bigdisc/rh635/imagenet/winter21_whole/'

root = './'
data_dir = root + 'data/'
source_dir = root + 'src/'
website_dir = source_dir + 'website/'
raw_data_dir = data_dir + 'raw/'
extracted_data_dir = data_dir + 'extracted/'

lemmas_to_senses_py_file = raw_data_dir + 'lemmas_to_senses.pkl'
concepts_to_definitions_py_file = raw_data_dir + 'concepts_to_definitions.pkl'
senses_to_info_py_file = raw_data_dir + 'senses_to_info.pkl'
example_sentences_file_princeton = raw_data_dir + 'example_sentences_princeton.pkl'  # list of annotated_sentence

lemmas_to_senses_js_file = extracted_data_dir + 'lemmas_to_senses.json'
concepts_to_definitions_js_file = extracted_data_dir + 'concepts_to_definitions.json'
senses_to_info_js_file = extracted_data_dir + 'senses_to_info.json'

lemmas_to_senses_dir = extracted_data_dir + 'lemmas_to_senses/'
concepts_to_definitions_dir = extracted_data_dir + 'concepts_to_definitions/'
senses_to_info_dir = extracted_data_dir + 'senses_to_info/'

queues_js_file = extracted_data_dir + 'queues.json'

image_dir = extracted_data_dir + 'images/'

# Parameters
QUEUE_LENGTH = 100
MIN_SENSES = 2
MAX_SENSES = 10