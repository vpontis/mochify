#!/usr/bin/env bun
import { MochiClient } from './mochi-client';

const ALPHABET_TEMPLATE_ID = 'A1FB7Om3';
const FIELD_IDS = {
  letter: 'name',
  examples: 'ICw3PJ5P', 
  notes: 'uFlKtSzD',
  sentences: 'o4SP1KY9'
};

async function syncSwedishAlphabet() {
  const client = new MochiClient(process.env.MOCHI_API_KEY!);
  
  // Load the JSON file
  const file = Bun.file('./swedish-alphabet.json');
  const swedishAlphabet = await file.json();
  
  console.log('🇸🇪 Swedish Alphabet Sync\n');
  
  // Find or create deck
  const decks = await client.listDecks();
  let deck = decks.find(d => d.name === 'Swedish Alphabet');
  
  if (!deck) {
    deck = await client.createDeck({ name: 'Swedish Alphabet' });
    console.log(`✅ Created new deck: ${deck.name} (${deck.id})\n`);
  } else {
    console.log(`📚 Using deck: ${deck.name} (${deck.id})\n`);
  }
  
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  
  for (const item of swedishAlphabet) {
    try {
      const fieldData = {
        [FIELD_IDS.letter]: {
          id: FIELD_IDS.letter,
          value: item.letter
        },
        [FIELD_IDS.examples]: {
          id: FIELD_IDS.examples,
          value: item.examples
        },
        [FIELD_IDS.notes]: {
          id: FIELD_IDS.notes,
          value: item.notes
        },
        [FIELD_IDS.sentences]: {
          id: FIELD_IDS.sentences,
          value: item.sentences || ''
        }
      };
      
      if (item.mochiId) {
        // Card exists - check if it needs updating
        try {
          const existingCard = await client.getCard(item.mochiId);
          
          // Check if content has changed
          const currentExamples = existingCard.fields?.[FIELD_IDS.examples]?.value || '';
          const currentNotes = existingCard.fields?.[FIELD_IDS.notes]?.value || '';
          const currentSentences = existingCard.fields?.[FIELD_IDS.sentences]?.value || '';
          
          if (currentExamples === item.examples && 
              currentNotes === item.notes && 
              currentSentences === (item.sentences || '')) {
            unchanged++;
            process.stdout.write(`\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`);
            continue;
          }
          
          // Content changed - recreate card
          console.log(`\n🔄 Updating ${item.letter}...`);
          await client.deleteCard(item.mochiId);
          
          const newCard = await client.createCard({
            content: '',
            'deck-id': deck.id,
            'template-id': ALPHABET_TEMPLATE_ID,
            fields: fieldData,
            tags: ['swedish', 'alphabet'],
          });
          
          item.mochiId = newCard.id; // Update ID in place
          updated++;
          
        } catch (error) {
          // Card doesn't exist anymore, create new one
          console.log(`\n⚠️  Card for ${item.letter} not found, creating new...`);
          
          const newCard = await client.createCard({
            content: '',
            'deck-id': deck.id,
            'template-id': ALPHABET_TEMPLATE_ID,
            fields: fieldData,
            tags: ['swedish', 'alphabet'],
          });
          
          item.mochiId = newCard.id;
          created++;
        }
      } else {
        // No ID - create new card
        const newCard = await client.createCard({
          content: '',
          'deck-id': deck.id,
          'template-id': ALPHABET_TEMPLATE_ID,
          fields: fieldData,
          tags: ['swedish', 'alphabet'],
        });
        
        item.mochiId = newCard.id; // Add ID to the item
        created++;
      }
      
      process.stdout.write(`\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`);
      
    } catch (error) {
      failed++;
      console.error(`\n❌ Failed to process ${item.letter}: ${error}`);
    }
  }
  
  // Save the updated JSON with IDs
  await Bun.write('./swedish-alphabet.json', JSON.stringify(swedishAlphabet, null, 2));
  
  console.log('\n\n📊 Summary:');
  console.log(`  ⏭️  Unchanged: ${unchanged} cards`);
  console.log(`  ✅ Created: ${created} new cards`);
  console.log(`  ✏️  Updated: ${updated} cards`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed} cards`);
  }
  console.log('\n💾 IDs saved directly in swedish-alphabet.json');
  console.log('🎉 Sync complete!');
}

// Run the script
if (import.meta.main) {
  try {
    await syncSwedishAlphabet();
  } catch (error) {
    console.error('Error:', error);
  }
}