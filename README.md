# Mochify - Mochi Cards API Client

A TypeScript library and CLI for creating and managing [Mochi](https://mochi.cards) flashcards programmatically, focusing on language learning with spaced repetition.

## Features

- 🚀 TypeScript API client for Mochi Cards
- 🎯 Type-safe API calls with Zod validation
- 📚 Bulk card creation and management
- 🗣️ Language learning focused (Swedish alphabet & vocabulary)
- 🖼️ AI-powered image generation for vocabulary cards (OpenAI)
- 📋 Template-based card creation with dynamic fields
- 🔄 Incremental sync - only creates/updates changed cards
- ⚡ Built with Bun for fast execution

## What is Mochi?

[Mochi](https://mochi.cards) is a modern spaced repetition app for studying and memorization. It allows you to create digital flashcards and review them at optimal intervals to maximize retention.

## What is Spaced Repetition?

Spaced repetition is a learning technique that involves reviewing information at increasing intervals over time. Instead of cramming, you review cards just before you're likely to forget them. This method has been scientifically proven to improve long-term retention and is particularly effective for language learning, vocabulary acquisition, and memorizing facts.

The algorithm schedules reviews based on your performance:

- Cards you know well are shown less frequently
- Cards you struggle with are shown more often
- Review intervals gradually increase as you demonstrate mastery

## Installation

```bash
bun install
```

## Setup

Create a `.env` file with your API keys:

```env
MOCHI_API_KEY=your_mochi_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional: for image generation
```

- Get your Mochi API key from the [Mochi settings](https://app.mochi.cards/settings/api)
- Get your OpenAI API key from the [OpenAI platform](https://platform.openai.com/api-keys) (optional, only needed for image generation)

## Usage

### CLI Commands

```bash
# List all decks
bun mochi-client.ts decks

# List cards in a deck
bun mochi-client.ts cards <deck-id>

# Create a new card
bun mochi-client.ts create-card <deck-id> "Front content" "Back content"

# Sync Swedish alphabet cards
bun alphabet/sync-swedish-alphabet.ts

# Sync Swedish vocabulary cards
bun vocab/sync-swedish-vocabulary.ts

# Add notes to existing vocabulary cards
bun vocab/add-notes-to-vocabulary.ts

# Generate images for vocabulary cards
bun vocab/gen-images.ts

# Update vocabulary template
bun vocab/update-vocabulary-template.ts

# Generate individual images using OpenAI
bun image-gen/generate-images.ts
```

### API Client Usage

```typescript
import { MochiClient } from "./utils/mochi-client";

const client = new MochiClient({ apiKey: process.env.MOCHI_API_KEY });

// Get all decks
const decks = await client.getDecks();

// Create a card
const card = await client.createCard({
  content: "Front of card",
  deckId: "deck-id",
  tags: ["swedish", "vocabulary"],
});
```

## Mochi API Overview

### Core Concepts

- **Decks**: Hierarchical containers for cards
- **Cards**: Markdown-formatted flashcards with multiple sides
- **Templates**: Reusable card structures with dynamic fields
- **Fields**: Structured data placeholders in templates

### Template System

Mochi uses a powerful template system with Mustache-style syntax:

- **Field Embedding**: `<< FieldName >>` embeds field values
- **Conditional Rendering**:
  - `<<# field >>...<</ field >>` - Show if field exists
  - `<<^ field >>...<</ field >>` - Show if field doesn't exist
- **Dynamic Fields**: Support for text-to-speech, translations, image search, etc.

Example template:

```markdown
## << Word >>

<<#Translation>>
Translation: << Translation >>
<</Translation>>

---

<< Definition >>

<<#Example>>
Example: << Example >>
<</Example>>
```

## Templates and Vocabulary Management

This project includes specialized templates and workflows for Swedish language learning:

### Swedish Vocabulary Template

The vocabulary template creates structured cards with:

- **Word**: The Swedish word (primary field)
- **English**: Translation(s)
- **Examples**: Context sentences with translations
- **Audio**: Text-to-speech content
- **Notes**: Grammar forms and usage notes

Example card structure:

```markdown
## hej

---

hello, hi

**Examples**
Hej, hur mår du?
(Hello, how are you?)

Hej på dig också!
(Hello to you too!)

**Audio**
Hej, hur mår du? Hej på dig också!

**Notes**
Common greeting, informal
```

### Vocabulary Workflow

1. **Define vocabulary** in `vocab/swedish-core.json`
2. **Sync to Mochi** with `bun vocab/sync-swedish-vocabulary.ts`
3. **Generate images** with `bun vocab/gen-images.ts` (uses OpenAI)
4. **Add grammar notes** with `bun vocab/add-notes-to-vocabulary.ts`
5. **Update templates** with `bun vocab/update-vocabulary-template.ts`

### Image Generation

AI-generated images help with vocabulary retention:

- Uses OpenAI's latest image models
- Generates contextual illustrations for vocabulary words
- Supports multiple quality levels (low/medium/high)
- Images are saved locally and can be uploaded to cards

### Card Format

Cards use markdown with `---` as side separators:

```markdown
# Front of card

Some content here

---

# Back of card

Answer or additional information
```

## Project Structure

```
mochify/
├── mochi-client.ts             # Main API client and CLI
├── fetch-json.ts               # HTTP utility with Zod validation
├── utils.ts                    # Shared utilities
├── alphabet/
│   ├── swedish-alphabet.json   # Swedish alphabet learning data
│   └── sync-swedish-alphabet.ts # Swedish alphabet sync script
├── vocab/
│   ├── swedish-core.json       # Core Swedish vocabulary
│   ├── sync-swedish-vocabulary.ts # Vocabulary sync script
│   ├── add-notes-to-vocabulary.ts # Add notes to existing cards
│   ├── gen-images.ts           # Generate images for vocab cards
│   └── update-vocabulary-template.ts # Template management
├── image-gen/
│   └── generate-images.ts      # OpenAI image generation
├── templates/
│   ├── swedish-alphabet-template.md # Alphabet card template
│   └── swedish-vocabulary-template.md # Vocabulary card template
├── images/                     # Generated vocabulary images
└── CLAUDE.md                   # AI assistant instructions
```

## Dependencies

### Core Dependencies

- **[Zod](https://zod.dev/)** - Schema validation and type inference
- **[Commander.js](https://github.com/tj/commander.js)** - CLI framework
- **[OpenAI](https://github.com/openai/openai-node)** - Image generation API
- **[p-limit](https://github.com/sindresorhus/p-limit)** - Concurrent request limiting

### Development Dependencies

- **[TypeScript](https://typescriptlang.org/)** - Type safety
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Bun](https://bun.sh/)** - Runtime and package manager

## Development

### Running Tests

```bash
bun test
```

### Code Formatting

```bash
bun run prettier --write .
```

### Code Style

This project uses named arguments for functions with multiple parameters:

```typescript
// Good - named arguments for clarity
createCard({
  content: "Card content",
  deckId: "abc123",
  tags: ["swedish", "alphabet"],
});

// Avoid - positional arguments for multiple params
createCard("Card content", "abc123", ["swedish", "alphabet"]);
```

## License

MIT
