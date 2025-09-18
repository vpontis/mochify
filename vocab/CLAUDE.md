---
description: Complete guide for managing Swedish vocabulary in the Mochify system
globs: "vocab/*.json, vocab/*.ts, images/*.png"
---

# Swedish Vocabulary Management Guide

This guide explains how to add and manage Swedish vocabulary cards in the Mochify system.

## Quick Start: Adding New Vocabulary

### Step-by-Step Process

#### 1. Create Word List for Confirmation

First, create a simple numbered list of Swedish words with English translations for review:

```
1. hej - hello, hi
2. tack - thanks, thank you
3. vad - what
4. hur - how
5. varför - why
```

Present this list for confirmation before proceeding to the next steps.

#### 2. Add Words to swedish-core.json

After confirmation, edit `vocab/swedish-core.json` and add new vocabulary entries following this structure:

```json
{
  "word": "hej",
  "english": "hello, hi",
  "examples": "Hej, hur mår du?\n(Hello, how are you?)\n\nHej på dig!\n(Hello to you!)",
  "audio": "Hej, hur mår du? Hej på dig!",
  "tags": ["swedish", "core200"],
  "notes": "Common greeting, informal"
}
```

**Field descriptions:**

- `word`: The Swedish word or phrase
- `english`: English translation(s)
- `examples`: Swedish sentences with English translations in parentheses
- `audio`: Text for text-to-speech (usually the example sentences)
- `tags`: Use `["swedish"]` (omit "core" tags)
- `notes`: Grammar notes, conjugations, or usage tips
- `mochiId`: (Auto-generated) Don't add this manually - it's created during sync

#### 3. Sync to Mochi

Run the sync script to upload new cards and update existing ones:

```bash
bun vocab/sync-swedish-vocabulary.ts
```

The script will:

- Create new cards for entries without `mochiId`
- Update existing cards that have `mochiId`
- Save the generated IDs back to `swedish-core.json`

#### 4. Generate Images (Required for Visual Learning)

Generate AI-powered images for all new cards:

```bash
bun vocab/gen-images.ts
```

This script:

- Uses OpenAI's DALL-E to create contextual images
- Saves images as `images/{mochiId}.png`
- Skips cards that already have images
- Processes 5 images concurrently for efficiency

**Note:** Requires `OPENAI_API_KEY` in your `.env` file

### Optional: Guide Images with a Hint

You can add an `imageHint` to any vocab item in `vocab/swedish-core.json`. Keep it short (6–15 words) and concrete; it seeds the scene the AI elaborates:

```json
{
  "word": "norrsken",
  "english": "northern lights",
  "examples": "Norrskenet lyser över fjällen.\n(The northern lights shine over the fells.)\n\nVi står tysta och ser norrsken dansa.\n(We stand silent and watch the northern lights dance.)",
  "audio": "Norrskenet lyser över fjällen. Vi står tysta och ser norrsken dansa.",
  "tags": ["swedish"],
  "notes": "ett norrsken; plural norrsken",
  "imageHint": "environment only: aurora over snowy ridge; no people"
}
```

If omitted, the generator writes a general prompt and lets the model pick an appropriate composition.

#### 5. Re-sync to Add Images

After generating images, sync again to add them to the cards:

```bash
bun vocab/sync-swedish-vocabulary.ts
```

The sync script automatically:

- Detects images in the `images/` directory
- Adds image links to the card notes
- Updates the cards in Mochi with the images

## Vocabulary Sources

### Swedish Core Frequency Lists

The vocabulary is based on Swedish frequency studies. Common sources include:

1. **Kelly List**: A frequency-based list of Swedish words
2. **Swedish Core 100/500/1000**: Most common Swedish words by frequency
3. **CSN Swedish Word List**: Common words for Swedish learners

### Recommended Word Order (by frequency)

**Words 1-50**: Basic function words (och, att, i, det, som, på, av, för)
**Words 51-100**: Common verbs and pronouns (att göra, att se, jag, du, vi)
**Words 101-150**: Essential verbs (att äta, att dricka, att arbeta)
**Words 151-200**: Family, emotions, adjectives (familj, glad, ledsen, stor, liten)
**Words 201-300**: Time, places, activities
**Words 301-500**: Expanded vocabulary for daily life
**Words 501-1000**: Intermediate vocabulary
**Words 1001+**: Advanced vocabulary

## Best Practices

### 1. Example Sentences

Always include 2-3 example sentences that:

- Show the word in context
- Demonstrate different uses or meanings
- Include common collocations

### 2. Grammar Notes

Include in the `notes` field:

- Verb conjugations (present/past/supine)
- Noun genders and plurals
- Adjective forms (en/ett/plural)
- Irregular forms
- Common expressions using the word

### 3. Audio Text

The `audio` field should contain:

- The word itself
- All example sentences
- Clear, natural Swedish that can be read by TTS

### 4. Tagging Strategy

Use consistent tags:

- `swedish`: Always include for Swedish cards
- Omit frequency tags like `core150`/`core200` to keep decks simple
- Optional extras if helpful: `verb`, `adjective`, `emotion`, etc.

## Batch Processing Tips

### Adding Multiple Words

1. Prepare your word list with translations
2. Use a consistent format in the JSON
3. Add words in batches of 50-100 for easier management
4. Test with a small batch first

### Complete Workflow for Adding 50 New Words

```bash
# 1. Edit the JSON file to add new vocabulary
vim vocab/swedish-core.json

# 2. Validate JSON syntax
bun -e "JSON.parse(require('fs').readFileSync('vocab/swedish-core.json', 'utf8'))"

# 3. Sync to Mochi (creates cards and saves mochiId)
bun vocab/sync-swedish-vocabulary.ts

# 4. Generate images for all new cards (REQUIRED)
bun vocab/gen-images.ts

# 5. Re-sync to add images to cards
bun vocab/sync-swedish-vocabulary.ts
```

**Important:** Always generate images after adding new cards. Visual memory aids significantly improve retention for language learning.

## Troubleshooting

### Common Issues

1. **JSON Syntax Errors**: Use a JSON validator or the validation command above
2. **Failed Syncs**: Check your Mochi API key in `.env`
3. **Duplicate Cards**: The script uses `mochiId` to prevent duplicates
4. **Rate Limiting**: The script processes one card at a time to avoid rate limits

### Checking Your Work

After syncing, verify in Mochi:

1. Open the Mochi app
2. Navigate to the "Swedish Core" deck
3. Check that new cards appear correctly
4. Test the audio and formatting

## Advanced Features

### Custom Templates

The vocabulary uses the template ID `GAFwzU5S` with these fields:

- Primary field (word): `name`
- English: `Vj1QoXZ7`
- Examples: `mknO4gtZ`
- Audio: `nRezTqnS`
- Notes: `c64dCRkt`

### Bulk Updates

To update all cards (e.g., to add new notes):

```bash
# 1. Modify swedish-core.json
# 2. Run sync - it will update all cards with mochiId
bun vocab/sync-swedish-vocabulary.ts
```

## Resources

- [Swedish Frequency Dictionary](https://frequencydictionary.com/swedish/)
- [Kelly Project](https://spraakbanken.gu.se/en/resources/kelly)
- [8000 Most Common Swedish Words](https://1000mostcommonwords.com/1000-most-common-swedish-words/)
- [Mochi API Documentation](https://app.mochi.cards/settings/api)
