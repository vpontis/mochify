#!/usr/bin/env bun
import { MochiClient } from "../utils/mochi-client";
import pLimit from "p-limit";
import { existsSync } from "node:fs";

interface VocabularyItem {
  word: string;
  english: string;
  examples: string;
  audio: string;
  tags: string[];
  mochiId?: string;
  notes?: string;
}

// Template configuration
const VOCABULARY_TEMPLATE_ID = "GAFwzU5S"; // Vocab Word template
const FIELD_IDS = {
  word: "name", // Primary field
  english: "Vj1QoXZ7", // English field
  examples: "mknO4gtZ", // Examples field
  audio: "nRezTqnS", // Audio field
  notes: "c64dCRkt", // Notes field
};

// Limit concurrent API requests
const limit = pLimit(1); // 1 concurrent request to avoid rate limiting

async function syncSwedishVocabulary() {
  const client = new MochiClient(process.env.MOCHI_API_KEY!);

  // Load the JSON file
  const file = Bun.file("./vocab/swedish-core.json");
  const vocabulary: VocabularyItem[] = await file.json();

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
  let skipped = 0;
  let failed = 0;

  // Function to sync a single card
  async function syncCard(item: VocabularyItem, index: number) {
    if (!deck) {
      throw new Error("Deck not found or created");
    }

    try {
      // Check if image exists for this card
      const imagePath = `./images/${item.mochiId}.png`;
      let notesWithImage = item.notes || "";

      if (item.mochiId && existsSync(imagePath)) {
        const imageUrl = `https://raw.githubusercontent.com/vpontis/mochify/refs/heads/master/images/${item.mochiId}.png`;
        notesWithImage = notesWithImage
          ? `${notesWithImage}\n\n![${item.word}](${imageUrl})`
          : `![${item.word}](${imageUrl})`;
      }

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
        [FIELD_IDS.notes]: {
          id: FIELD_IDS.notes,
          value: notesWithImage,
        },
      };

      // If already has ID, update the card
      if (item.mochiId) {
        const start = performance.now();
        const card = await client.createCard({
          id: item.mochiId, // Will update existing card
          content: "",
          "deck-id": deck.id,
          "template-id": VOCABULARY_TEMPLATE_ID,
          fields: fieldData,
          tags: item.tags,
        });
        const elapsed = performance.now() - start;

        updated++;
        console.log(
          `✏️  [${index + 1}/${vocabulary.length}] ${item.word} (${item.mochiId}) - updated in ${elapsed.toFixed(0)}ms`,
        );
        return;
      }

      // Create new card
      const start = performance.now();
      const card = await client.createCard({
        content: "",
        "deck-id": deck.id,
        "template-id": VOCABULARY_TEMPLATE_ID,
        fields: fieldData,
        tags: item.tags,
      });
      const elapsed = performance.now() - start;

      item.mochiId = card.id;
      created++;
      console.log(
        `✅ [${index + 1}/${vocabulary.length}] ${item.word} (${card.id}) - created in ${elapsed.toFixed(0)}ms`,
      );

      // Save after each successful creation
      await Bun.write(
        "./vocab/swedish-core.json",
        JSON.stringify(vocabulary, null, 2),
      );
    } catch (error) {
      failed++;
      console.error(
        `❌ [${index + 1}/${vocabulary.length}] ${item.word} (${item.mochiId || "no-id"}) - failed: ${error}`,
      );
    }
  }

  // Process all cards with concurrency limit
  const promises = vocabulary.map((item: VocabularyItem, index: number) =>
    limit(() => syncCard(item, index)),
  );

  await Promise.all(promises);

  // Save the updated JSON with IDs
  await Bun.write(
    "./vocab/swedish-core.json",
    JSON.stringify(vocabulary, null, 2),
  );

  console.log("\n\n📊 Summary:");
  console.log(`  ⏭️  Skipped: ${skipped} cards (already synced)`);
  console.log(`  ✅ Created: ${created} new cards`);
  console.log(`  ✏️  Updated: ${updated} cards`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed} cards`);
  }
  console.log("\n💾 IDs saved directly in vocab/swedish-core.json");
  console.log("🎉 Sync complete!");
}

export { syncSwedishVocabulary };

// Run the script
if (import.meta.main) {
  await syncSwedishVocabulary();
  process.exit(0);
}
