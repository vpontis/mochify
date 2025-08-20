# Swedish Alphabet Template

## Template Content

```markdown
## << Letter >>

---

<< Notes >>

**Examples**
<< Examples >>

**Audio**
<< Sentences >>
```

## Fields

### Letter (Primary Field)

- **Type**: Text
- **Description**: The Swedish letter
- **Example**: `A a`, `Ä ä`, `Ö ö`

### Notes

- **Type**: Text
- **Description**: Pronunciation notes and tips
- **Example**: `Pronounced like 'o' in 'more' but longer`

### Examples

- **Type**: Text (Multiline)
- **Description**: Example words containing the letter
- **Format**: List of words with English translations
- **Example**:

```
Äpple (Apple)
Älg (Moose)
Kär (Dear/In love)
```

### Sentences

- **Type**: Text (for TTS)
- **Description**: Example sentences for audio generation
- **Example**: `Äpple. Älg. Kär.`

## Current Template ID

This template is already created in Mochi with ID: `A1FB7Om3`

## Field IDs

```typescript
const ALPHABET_TEMPLATE_ID = "A1FB7Om3";
const FIELD_IDS = {
  letter: "name",
  examples: "ICw3PJ5P",
  notes: "uFlKtSzD",
  sentences: "o4SP1KY9",
};
```
