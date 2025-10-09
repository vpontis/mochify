---
description: Mochi Cards API client for Swedish vocabulary learning with AI-generated images
globs: "utils/*.ts, vocab/*.ts, templates/*.md"
alwaysApply: false
---

# Mochify - Mochi Cards API Client

TypeScript client and CLI for [Mochi](https://mochi.cards) flashcards. Currently focused on Swedish vocabulary learning with AI-powered images, but works as a general-purpose Mochi API client.

## Project Structure

**Core API Client:**

- `utils/mochi-client.ts` - Mochi API client and CLI
- `utils/fetch-json.ts` - HTTP utility with Zod validation
- `utils.ts` - Utilities (dedent)

**Swedish Vocabulary:**

- `vocab/add-words.ts` - AI-powered vocab generator (uses OpenAI)
- `vocab/sync-swedish-vocabulary.ts` - Sync to Mochi
- `vocab/gen-images.ts` - Generate DALL-E images (uses OpenAI)
- `vocab/swedish-core.json` - Vocabulary data with Mochi IDs
- `vocab/kelly-swedish.csv` - Swedish frequency list
- `images/` - Generated images (355+ files)

## Swedish Vocabulary Workflow

```bash
# 1. Add words (AI generates translations, examples, grammar notes)
bun vocab/add-words.ts hej tack fika
bun vocab/add-words.ts --kelly 20  # Add next 20 from frequency list

# 2. Sync to Mochi (creates/updates cards)
bun vocab/sync-swedish-vocabulary.ts

# 3. Generate images
bun vocab/gen-images.ts

# 4. Re-sync to add images to cards
bun vocab/sync-swedish-vocabulary.ts
```

## General CLI Usage

```bash
# List decks
bun utils/mochi-client.ts list-decks

# Create deck
bun utils/mochi-client.ts create-deck "My Deck"

# Create Q&A card
bun utils/mochi-client.ts create-qa <deck-id> "Question?" "Answer"

# List templates
bun utils/mochi-client.ts list-templates
```

## Mochi API Gotchas

### Template Cards

1. **Content field is required**: Even with templates, always set `content: ""` for template-based cards
2. **Field IDs vs Names**: Templates use field names (`<< Word >>`), but API requires field IDs
3. **Get field IDs**: Call `getTemplate(id)` to see field structure

Example field mapping:

```typescript
const FIELD_IDS = {
  word: "name", // Primary field is usually "name"
  english: "Vj1QoXZ7", // Get these from getTemplate()
  examples: "mknO4gtZ",
};
```

### Common Issues

- **422 errors**: Missing required fields or wrong field IDs
- **Nullable fields**: Use `.nullable().optional()` in Zod schemas for optional fields like `template-id`
- **Field structure**: Template fields can be arrays or objects - use union types

## Runtime

Use Bun (not Node.js):

- `bun <file>` instead of `node` or `ts-node`
- `bun install` instead of `npm install`
- Bun auto-loads `.env` files
- Prefer `Bun.file()` over `node:fs`

## Code Style

**Named arguments for multiple parameters:**

```ts
// Good
function createCard({ content, deckId, tags }: {...}) { ... }
createCard({ content: "...", deckId: "abc", tags: ["swedish"] });

// Bad
function createCard(content: string, deckId: string, tags?: string[]) { ... }
```

Single argument functions can use positional arguments.
