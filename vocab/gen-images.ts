#!/usr/bin/env bun

// Generate images for Mochi vocabulary cards
// Uses card IDs as filenames to maintain consistency

import { MochiClient } from "../mochi-client";
import { generateImage } from "../image-gen/generate-images";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const IMAGES_DIR = "./images/vocab";
const RATE_LIMIT_MS = 2000; // 2 seconds between API calls

async function ensureImagesDir() {
  if (!existsSync(IMAGES_DIR)) {
    await mkdir(IMAGES_DIR, { recursive: true });
  }
}

async function main() {
  const client = new MochiClient({
    apiKey: Bun.env.MOCHI_API_KEY!,
  });

  // Get the Swedish deck
  const decks = await client.listDecks();
  const swedishDeck = decks.find((d) => d.name === "Swedish");

  if (!swedishDeck) {
    console.error("Swedish deck not found!");
    return;
  }

  console.log(`Found Swedish deck: ${swedishDeck.id}`);

  // Get all cards in the deck
  const cards = await client.listCards({ "deck-id": swedishDeck.id });
  console.log(`Found ${cards.length} cards in Swedish deck`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const card of cards) {
    const imagePath = `${IMAGES_DIR}/${card.id}.png`;

    // Skip if image already exists
    if (existsSync(imagePath)) {
      console.log(`⏭️  Skipping ${card.id} - image already exists`);
      skipped++;
      continue;
    }

    // Extract word and translation from card fields
    // Assuming the card has fields like 'word' and 'english'
    const word = card.fields?.word || card.fields?.name || "unknown";
    const english =
      card.fields?.english || card.fields?.translation || "unknown";
    const context = card.fields?.context || card.fields?.notes;

    if (word === "unknown" || english === "unknown") {
      console.log(`⚠️  Skipping ${card.id} - missing word or translation`);
      skipped++;
      continue;
    }

    try {
      console.log(
        `\n🎨 Generating image for card ${card.id}: ${word} (${english})`,
      );

      await generateImage({
        word,
        english,
        context,
        outputPath: imagePath,
        quality: "medium", // Use medium quality to balance cost and quality
      });

      generated++;

      // Rate limiting
      if (cards.indexOf(card) < cards.length - 1) {
        console.log(`⏳ Waiting ${RATE_LIMIT_MS}ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }
    } catch (error) {
      console.error(`❌ Failed to generate image for ${card.id}:`, error);
      failed++;
    }
  }

  console.log("\n✨ Image generation complete!");
  console.log(
    `📊 Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`,
  );
}

// Run the script
if (import.meta.main) {
  if (!Bun.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!Bun.env.MOCHI_API_KEY) {
    console.error("Error: MOCHI_API_KEY environment variable is required");
    process.exit(1);
  }

  await ensureImagesDir();
  main().catch(console.error);
}
