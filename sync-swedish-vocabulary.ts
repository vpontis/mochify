#!/usr/bin/env bun
import { MochiClient } from "./mochi-client";

// Template configuration
const VOCABULARY_TEMPLATE_ID = "GAFwzU5S"; // Vocab Word template
const FIELD_IDS = {
  word: "name", // Primary field
  english: "Vj1QoXZ7", // English field
  examples: "mknO4gtZ", // Examples field
  audio: "nRezTqnS", // Audio field
};

async function syncSwedishVocabulary() {
  const client = new MochiClient(process.env.MOCHI_API_KEY!);

  // Load the JSON file
  const file = Bun.file("./vocabulary/swedish-core-150.json");
  const vocabulary = await file.json();

  console.log("🇸🇪 Swedish Vocabulary Sync\n");

  // Find or create deck
  const decks = await client.listDecks();
  let deck = decks.find((d) => d.name === "Swedish Core");

  if (!deck) {
    deck = await client.createDeck({ name: "Swedish Core" });
    console.log(`✅ Created new deck: ${deck.name} (${deck.id})\n`);
  } else {
    console.log(`📚 Using deck: ${deck.name} (${deck.id})\n`);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const item of vocabulary) {
    try {
      // Build field data for template
      const fieldData = {
        [FIELD_IDS.word]: {
          id: FIELD_IDS.word,
          value: item.word,
        },
        [FIELD_IDS.english]: {
          id: FIELD_IDS.english,
          value: item.english,
        },
        [FIELD_IDS.examples]: {
          id: FIELD_IDS.examples,
          value: item.examples,
        },
        [FIELD_IDS.audio]: {
          id: FIELD_IDS.audio,
          value: item.audio,
        },
      };

      const start = performance.now();
      const card = await client.createCard({
        id: item.mochiId, // Will update if exists, create if not
        content: "",
        "deck-id": deck.id,
        "template-id": VOCABULARY_TEMPLATE_ID,
        fields: fieldData,
        tags: item.tags,
      });
      const elapsed = performance.now() - start;

      if (item.mochiId) {
        updated++;
        console.log(`\n✏️  Updated ${item.word} in ${elapsed.toFixed(0)}ms`);
      } else {
        item.mochiId = card.id;
        created++;
        console.log(`\n✅ Created ${item.word} in ${elapsed.toFixed(0)}ms`);
      }

      process.stdout.write(
        `\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`,
      );
    } catch (error) {
      failed++;
      console.error(`\n❌ Failed to process ${item.word}: ${error}`);
    }
  }

  // Save the updated JSON with IDs
  await Bun.write(
    "./vocabulary/swedish-core-150.json",
    JSON.stringify(vocabulary, null, 2),
  );

  console.log("\n\n📊 Summary:");
  console.log(`  ⏭️  Unchanged: ${unchanged} cards`);
  console.log(`  ✅ Created: ${created} new cards`);
  console.log(`  ✏️  Updated: ${updated} cards`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed} cards`);
  }
  console.log("\n💾 IDs saved directly in swedish-core-150.json");
  console.log("🎉 Sync complete!");
}

// Run the script
if (import.meta.main) {
  try {
    await syncSwedishVocabulary();
  } catch (error) {
    console.error("Error:", error);
  }
}
