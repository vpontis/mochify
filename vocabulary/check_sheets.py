# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas",
#     "openpyxl",
#     "xlrd",
# ]
# ///

import pandas as pd

# Load the Excel file
excel_file = pd.ExcelFile('swedish-kelly.xls')

# List all sheet names
print("Available sheets in the Excel file:")
for i, sheet_name in enumerate(excel_file.sheet_names):
    print(f"  {i+1}. {sheet_name}")
    
# Try to read each sheet and show its structure
print("\nExamining each sheet:")
for sheet_name in excel_file.sheet_names:
    df = pd.read_excel('swedish-kelly.xls', sheet_name=sheet_name)
    print(f"\n'{sheet_name}' sheet:")
    print(f"  - Columns: {df.columns.tolist()}")
    print(f"  - Rows: {len(df)}")
    if len(df) > 0:
        print(f"  - First row sample:")
        first_row = df.iloc[0]
        for col in df.columns[:5]:  # Show first 5 columns
            if col in df.columns:
                print(f"    {col}: {first_row[col]}")
