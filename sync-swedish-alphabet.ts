#!/usr/bin/env bun
import { MochiClient } from "./mochi-client";
import swedishAlphabet from "./swedish-alphabet.json";

// Sync file to track card IDs
interface SyncData {
  deckId: string | null;
  templateId: string;
  lastSync: string | null;
  cards: Record<string, string>; // letter -> cardId mapping
}

const SYNC_FILE = "./swedish-alphabet-sync.json";
const ALPHABET_TEMPLATE_ID = "A1FB7Om3";
const FIELD_IDS = {
  letter: "name",
  examples: "ICw3PJ5P",
  notes: "uFlKtSzD",
};

async function loadSyncData(): Promise<SyncData> {
  try {
    const file = Bun.file(SYNC_FILE);
    return await file.json();
  } catch {
    return {
      deckId: null,
      templateId: ALPHABET_TEMPLATE_ID,
      lastSync: null,
      cards: {},
    };
  }
}

async function saveSyncData(data: SyncData) {
  await Bun.write(SYNC_FILE, JSON.stringify(data, null, 2));
}

async function syncSwedishAlphabet() {
  const client = new MochiClient(process.env.MOCHI_API_KEY!);
  const syncData = await loadSyncData();

  console.log("🇸🇪 Smart Swedish Alphabet Sync\n");

  // Find or create deck
  let deckId = syncData.deckId;
  if (!deckId) {
    const decks = await client.listDecks();
    const existingDeck = decks.find((d) => d.name === "Swedish Alphabet");

    if (existingDeck) {
      deckId = existingDeck.id;
      console.log(`📚 Found existing deck: ${existingDeck.name} (${deckId})`);
    } else {
      const newDeck = await client.createDeck({ name: "Swedish Alphabet" });
      deckId = newDeck.id;
      console.log(`✅ Created new deck: ${newDeck.name} (${deckId})`);
    }

    syncData.deckId = deckId;
  } else {
    console.log(`📚 Using saved deck: ${deckId}`);
  }

  console.log(`📝 Processing ${swedishAlphabet.length} letters...\n`);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const item of swedishAlphabet) {
    try {
      const letterKey = item.letter.toLowerCase().replace(/\s+/g, "-");
      const existingCardId = syncData.cards[letterKey];

      const fieldData = {
        [FIELD_IDS.letter]: {
          id: FIELD_IDS.letter,
          value: item.letter,
        },
        [FIELD_IDS.examples]: {
          id: FIELD_IDS.examples,
          value: item.examples,
        },
        [FIELD_IDS.notes]: {
          id: FIELD_IDS.notes,
          value: item.notes,
        },
      };

      if (existingCardId) {
        // Try to get the existing card to check if it needs updating
        try {
          const existingCard = await client.getCard(existingCardId);

          // Check if content has changed
          const currentExamples =
            existingCard.fields?.[FIELD_IDS.examples]?.value || "";
          const currentNotes =
            existingCard.fields?.[FIELD_IDS.notes]?.value || "";

          if (
            currentExamples === item.examples &&
            currentNotes === item.notes
          ) {
            unchanged++;
            process.stdout.write(
              `\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`,
            );
            continue;
          }

          // Card exists but content changed - need to delete and recreate
          // (Since Mochi API doesn't support updating template fields)
          console.log(`\n🔄 Content changed for ${item.letter}, recreating...`);
          await client.deleteCard(existingCardId);

          const newCard = await client.createCard({
            content: "",
            "deck-id": deckId,
            "template-id": ALPHABET_TEMPLATE_ID,
            fields: fieldData,
            tags: ["swedish", "alphabet"],
          });

          syncData.cards[letterKey] = newCard.id;
          updated++;
          process.stdout.write(
            `\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`,
          );
        } catch (error) {
          // Card doesn't exist anymore, create new one
          console.log(
            `\n⚠️  Card ${existingCardId} not found, creating new...`,
          );

          const newCard = await client.createCard({
            content: "",
            "deck-id": deckId,
            "template-id": ALPHABET_TEMPLATE_ID,
            fields: fieldData,
            tags: ["swedish", "alphabet"],
          });

          syncData.cards[letterKey] = newCard.id;
          created++;
          process.stdout.write(
            `\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`,
          );
        }
      } else {
        // Create new card
        const newCard = await client.createCard({
          content: "",
          "deck-id": deckId,
          "template-id": ALPHABET_TEMPLATE_ID,
          fields: fieldData,
          tags: ["swedish", "alphabet"],
        });

        syncData.cards[letterKey] = newCard.id;
        created++;
        process.stdout.write(
          `\r⏭️  Unchanged: ${unchanged} | ✅ Created: ${created} | ✏️  Updated: ${updated}`,
        );
      }
    } catch (error) {
      failed++;
      console.error(`\n❌ Failed to process ${item.letter}: ${error}`);
    }
  }

  // Save sync data
  syncData.lastSync = new Date().toISOString();
  await saveSyncData(syncData);

  console.log("\n\n📊 Sync Summary:");
  console.log(`  ⏭️  Unchanged: ${unchanged} cards`);
  console.log(`  ✅ Created: ${created} new cards`);
  console.log(`  ✏️  Updated: ${updated} cards`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed} cards`);
  }
  console.log(`\n💾 Sync data saved to ${SYNC_FILE}`);
  console.log("🎉 Smart sync complete!");
}

// Run the script
if (import.meta.main) {
  try {
    await syncSwedishAlphabet();
  } catch (error) {
    console.error("Error:", error);
  }
}
