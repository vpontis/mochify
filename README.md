# Mochify - Mochi Cards API Client

A TypeScript library and CLI for creating and managing [Mochi](https://mochi.cards) flashcards programmatically, focusing on language learning with spaced repetition.

## Features

- 🚀 TypeScript API client for Mochi Cards
- 🎯 Type-safe API calls with Zod validation
- 📚 Bulk card creation and management
- 🗣️ Language learning focused (Swedish alphabet example included)
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

Create a `.env` file with your Mochi API key:

```env
MOCHI_API_KEY=your_api_key_here
```

Get your API key from the [Mochi settings](https://app.mochi.cards/settings/api).

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
bun sync-swedish-alphabet.ts
```

### API Client Usage

```typescript
import { MochiClient } from "./mochi-client";

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
├── mochi-client.ts         # Main API client and CLI
├── fetch-json.ts           # HTTP utility with Zod validation
├── sync-swedish-alphabet.ts # Swedish alphabet sync script
├── swedish-alphabet.json   # Swedish alphabet learning data
└── CLAUDE.md              # AI assistant instructions
```

## Development

### Running Tests

```bash
bun test
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
