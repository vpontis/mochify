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

# Read the Excel file
df = pd.read_excel('swedish-kelly.xls')

# Show column names
print("Columns:", df.columns.tolist())
print(f"\nTotal entries: {len(df)}")

# Display first 10 rows to understand structure
print("\nFirst 10 entries:")
print(df.head(10))

# Get first 150 entries
first_150 = df.head(150)

# Save to JSON for further processing
first_150.to_json('kelly-150-raw.json', orient='records', force_ascii=False, indent=2)
print("\nSaved first 150 entries to kelly-150-raw.json")

# Show a sample of what we have
print("\nSample of data types in first row:")
for col in df.columns:
    print(f"  {col}: {df.iloc[0][col]}")
