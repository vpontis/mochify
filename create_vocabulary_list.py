# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas",
#     "xlrd",
#     "openpyxl",
# ]
# ///

import json
import pandas as pd

# Read the Kelly list
df = pd.read_excel('swedish-kelly.xls', sheet_name='Swedish_M3_CEFR')
df.columns = df.columns.str.strip()

# Filter out less useful word types and get most frequent words
# Skip excessive numbers, proper names for now
useful_words = df[
    (~df['Word classes'].isin(['numeral', 'proper name'])) | 
    (df['Swedish items for translation'].isin(['ett', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'hundra', 'tusen']))
].head(200)

# Also include important words that might be further down but are essential
essential_words = ['hej', 'tack', 'ja', 'nej', 'god', 'morgon', 'kväll', 'dag', 'natt', 
                  'familj', 'barn', 'mamma', 'pappa', 'mat', 'vatten', 'kaffe', 'arbete', 
                  'skola', 'hem', 'vän', 'pengar', 'tid', 'vecka', 'månad', 'idag', 'imorgon',
                  'igår', 'snäll', 'ledsen', 'glad', 'arg', 'trött', 'hungrig']

# Get the vocabulary
vocabulary = []
word_count = 0

# Add from Kelly list first
for _, row in useful_words.iterrows():
    if word_count >= 150:
        break
    
    word = row['Swedish items for translation']
    word_class = row['Word classes']
    grammar = row.get('Gram-\nmar', '')
    
    # Clean up word
    word = word.split('(')[0].strip()  # Remove parenthetical variations
    
    # Format word with article/infinitive marker
    if word_class == 'verb':
        word_formatted = f"att {word}"
    elif word_class == 'noun-en' and grammar == 'en':
        word_formatted = f"en {word}"
    elif word_class == 'noun-ett' and grammar == 'ett':
        word_formatted = f"ett {word}"
    elif word_class == 'noun-en':
        word_formatted = f"en {word}" 
    elif word_class == 'noun-ett':
        word_formatted = f"ett {word}"
    else:
        word_formatted = word
    
    vocabulary.append({
        'word': word_formatted,
        'word_class': word_class,
        'cefr': row['CEFR levels']
    })
    word_count += 1

print(f"Selected {len(vocabulary)} words")

# Show distribution
word_classes = pd.DataFrame(vocabulary)['word_class'].value_counts()
print("\nWord class distribution:")
for wc, count in word_classes.items():
    print(f"  {wc}: {count}")

# Save for next step
with open('vocabulary-base.json', 'w', encoding='utf-8') as f:
    json.dump(vocabulary, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(vocabulary)} words to vocabulary-base.json")
