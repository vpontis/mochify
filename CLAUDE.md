---
description: Mochi Cards API client and CLI for language learning with spaced repetition
globs: "*.ts, package.json, swedish-alphabet.json"
alwaysApply: false
---

# Mochify - Mochi Cards API Client

A TypeScript library and CLI for creating and managing [Mochi](https://mochi.cards) flashcards programmatically, focusing on language learning with spaced repetition.

## Project Structure

- `mochi-client.ts` - Main Mochi API client and CLI implementation
- `fetch-json.ts` - HTTP utility with Zod validation for type-safe API calls
- `sync-swedish-alphabet.ts` - Script to sync Swedish alphabet cards with Mochi
- `swedish-alphabet.json` - Swedish alphabet learning data

## Mochi API Overview

### Core Concepts

- **Decks**: Hierarchical containers for organizing cards by topic or subject
- **Cards**: Markdown-formatted flashcards with support for multiple sides (separated by `---`)
- **Templates**: Reusable card structures with dynamic field placeholders
- **Fields**: Structured data that can be embedded in templates using `<< FieldName >>` syntax

### Template System

Mochi's template system is powerful for creating consistent card formats:

#### Field Embedding

- Basic syntax: `<< FieldName >>` embeds the value of a field
- Fields are defined when creating cards from templates

#### Conditional Rendering (Mustache-style)

- Show if field exists: `<<# FieldName >>content<</ FieldName >>`
- Show if field doesn't exist: `<<^ FieldName >>content<</ FieldName >>`

#### Dynamic Field Types

Templates support various dynamic field types that generate content automatically:

- **Text-to-speech**: Generate audio pronunciation
- **Translation**: Auto-translate between languages
- **Image search**: Find relevant images
- **Dictionary lookup**: Get definitions
- **AI text generation**: Generate explanations or examples
- **Language annotations**: Pinyin for Chinese, Furigana for Japanese

#### Example Template

```markdown
## << Word >>

<<#Pronunciation>>
🔊 << Pronunciation >>
<</Pronunciation>>

<<#Translation>>
Translation: << Translation >>
<</Translation>>

---

## Definition

<< Definition >>

<<#Example>>

### Example

<< Example >>
<</Example>>

<<#Notes>>

### Notes

<< Notes >>
<</Notes>>
```

### Card Creation Best Practices

1. **Use consistent formatting**: Markdown headers for structure
2. **Leverage templates**: Create reusable templates for similar card types
3. **Use tags**: Add relevant tags for organization
4. **Include context**: Add example sentences and usage notes
5. **Primary field**: Designate one field as primary for UI representation

## Mochi API Gotchas & Troubleshooting

### Template vs Regular Cards

1. **Content field is always required**: Even when using templates with fields, the API requires a `content` field. Set it to empty string `""` for template-based cards.

2. **Template field IDs vs Names**:

   - Templates reference fields by **name** in the content (e.g., `<< Word >>`)
   - The API uses field **IDs** when setting values (e.g., `Vj1QoXZ7`)
   - Field IDs can be retrieved by calling `getTemplate()` to inspect the template structure

3. **Field ID mapping**: When using templates, always map field names to their IDs:
   ```typescript
   const FIELD_IDS = {
     word: "name", // Primary field is often "name"
     english: "Vj1QoXZ7", // Get actual IDs from template
     examples: "mknO4gtZ",
     audio: "nRezTqnS",
   };
   ```

### API Response Validation

1. **Nullable fields**: The API may return `null` for optional fields like `template-id`. Update Zod schemas to handle nullables:

   ```typescript
   "template-id": z.string().nullable().optional()
   ```

2. **Field structure variations**: Template fields may be returned as objects or arrays depending on the endpoint. Use union types in schemas.

3. **HTTP 422 errors**: Usually means required fields are missing or field IDs are incorrect. Check:
   - Content field is included (even if empty)
   - Field IDs match the template exactly
   - All required template fields are provided

### Deck Management

1. **Deck names matter**: Be consistent with deck names - the exact name is used for finding/creating decks
2. **Check existing decks**: Use `list-decks` to verify deck names and IDs before syncing

### Debugging Tips

1. **Get template details programmatically**:

   ```typescript
   const template = await client.getTemplate(templateId);
   console.log(template.fields); // Shows all field IDs
   ```

2. **Verify card creation**: After creating cards with templates, fetch one to verify fields are set correctly:

   ```typescript
   const card = await client.getCard(cardId);
   console.log(card.fields); // Check field values
   ```

3. **API error responses**: Add logging to see detailed error messages:
   ```typescript
   if (!response.ok) {
     const error = await FetchError.fromResponse(response);
     console.error("API Error:", error.responseText);
   }
   ```

## Runtime

Default to using Bun instead of Node.js:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` instead of `npm install` or `yarn install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env files, so don't use dotenv

## Bun APIs

When working with this codebase, prefer Bun's built-in APIs:

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.$` for shell commands instead of execa
- Bun has built-in support for TypeScript and JSX

## Testing

Use `bun test` to run tests:

```ts
import { test, expect } from "bun:test";

test("example test", () => {
  expect(1).toBe(1);
});
```

# Code Style Preferences

## Function Arguments

- Always use named arguments (object destructuring) for functions with more than one parameter
- Single argument functions can use positional arguments
- This improves readability and makes the code self-documenting

Good examples:

```ts
// Single argument - positional is fine
function getDeck(deckId: string) { ... }

// Multiple arguments - use named
function createCard({ content, deckId, tags }: {
  content: string;
  deckId: string;
  tags?: string[];
}) { ... }

// Call with named arguments
createCard({
  content: "Card content",
  deckId: "abc123",
  tags: ["swedish", "alphabet"]
});
```

Bad examples:

```ts
// Don't use positional for multiple arguments
function createCard(content: string, deckId: string, tags?: string[]) { ... }
```

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
