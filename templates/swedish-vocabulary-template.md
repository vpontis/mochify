# Swedish Vocabulary Template

## Template Content

```markdown
## << Word >>

---

<< English >>

**Examples**
<< Examples >>

**Audio**
<< Audio >>
```

## Fields

### Word (Primary Field)

- **Type**: Text
- **Description**: The Swedish word or phrase
- **Example**: `hej`, `en bil`, `att göra`

### English

- **Type**: Text
- **Description**: English translation
- **Example**: `hello, hi`, `a car`, `to do, to make`

### Examples

- **Type**: Text (Multiline)
- **Description**: Two example sentences showing the word in context, with English translations
- **Format**:

```
Swedish sentence 1
(English translation 1)

Swedish sentence 2
(English translation 2)
```

- **Example**:

```
Hej, hur mår du?
(Hello, how are you?)

Hej på dig också!
(Hello to you too!)
```

### Audio

- **Type**: Text (for TTS hookup)
- **Description**: Swedish sentences for text-to-speech generation
- **Format**: All Swedish example sentences combined
- **Example**: `Hej, hur mår du? Hej på dig också!`

## How to Create This Template in Mochi

1. Go to Mochi's template section
2. Click "Create New Template"
3. Name it "Swedish Vocabulary"
4. Add the following fields:
   - **Word** (mark as Primary)
   - **English**
   - **Examples**
   - **Audio**
5. Paste the template content markdown above
6. Save the template

## Usage with sync-swedish-vocabulary.ts

Once created in Mochi, you'll get a template ID. Update the sync script to use it:

```typescript
const VOCABULARY_TEMPLATE_ID = "your-template-id-here";
const FIELD_IDS = {
  word: "field-id-for-word",
  english: "field-id-for-english",
  examples: "field-id-for-examples",
  audio: "field-id-for-audio",
};
```

Then modify the sync to use template fields instead of markdown content.
