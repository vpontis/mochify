# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas",
#     "openpyxl",
#     "xlrd",
# ]
# ///

import pandas as pd
import json

# Read the Swedish_M3_CEFR sheet
df = pd.read_excel('swedish-kelly.xls', sheet_name='Swedish_M3_CEFR')

# Clean column names
df.columns = df.columns.str.strip()

print("Columns:", df.columns.tolist())
print(f"Total words: {len(df)}")

# Get first 150 entries
first_150 = df.head(150)

# Show sample entries
print("\nSample entries (first 20):")
for i in range(min(20, len(first_150))):
    row = first_150.iloc[i]
    word = row['Swedish items for translation']
    word_class = row['Word classes']
    cefr = row['CEFR levels']
    examples = row['Examples'] if pd.notna(row['Examples']) else ""
    print(f"{i+1:3}. {word:<15} [{word_class:<10}] CEFR: {cefr}")
    if examples:
        print(f"     Example: {examples[:100]}...")

# Save the raw data
first_150.to_json('kelly-150-raw.json', orient='records', force_ascii=False, indent=2)
print(f"\nSaved {len(first_150)} entries to kelly-150-raw.json")

# Count word classes
word_classes = first_150['Word classes'].value_counts()
print("\nWord class distribution in top 150:")
for wc, count in word_classes.items():
    print(f"  {wc}: {count}")
