#!/usr/bin/env bun

// Generate images for Mochi vocabulary cards
// Uses card IDs as filenames to maintain consistency

import { MochiClient } from "../mochi-client";
import { generateImage } from "../image-gen/generate-images";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import pLimit from "p-limit";

const IMAGES_DIR = "./images";
const CONCURRENCY = 3; // Process 3 images at a time
const limit = pLimit(CONCURRENCY);

async function ensureImagesDir() {
  if (!existsSync(IMAGES_DIR)) {
    await mkdir(IMAGES_DIR, { recursive: true });
  }
}

async function main() {
  console.log("Initializing Mochi client...");
  const client = new MochiClient(Bun.env.MOCHI_API_KEY!);

  // Get the Swedish Core Vocabulary deck
  console.log("Fetching decks...");
  const decks = await client.listDecks();
  const swedishDeck = decks.find((d) => d.name === "Swedish Core Vocabulary");

  if (!swedishDeck) {
    console.error("Swedish deck not found!");
    return;
  }

  console.log(`Found Swedish deck: ${swedishDeck.id}`);

  // Get all cards in the deck
  const cards = await client.listCards(swedishDeck.id, 1000); // Get up to 1000 cards
  console.log(`Found ${cards.length} cards in Swedish deck`);

  // Filter cards that need images (limit for testing)
  const cardsNeedingImages = cards.slice(0, 10).filter((card) => {
    const imagePath = `${IMAGES_DIR}/${card.id}.png`;
    if (existsSync(imagePath)) {
      console.log(`⏭️  Skipping ${card.id} - image already exists`);
      return false;
    }

    // Try to extract from fields first (template-based cards)
    let word = card.fields?.name?.value || card.fields?.word?.value || "";
    let english =
      card.fields?.["Vj1QoXZ7"]?.value ||
      card.fields?.english?.value ||
      card.fields?.translation?.value ||
      "";

    // If no fields, parse from content (markdown cards)
    if (!word || !english) {
      const lines = card.content.split("\n");
      const wordLine = lines.find((line) => line.startsWith("## "));
      word = word || wordLine?.replace("## ", "").trim() || "unknown";

      // Translation is typically after the --- separator
      const separatorIndex = lines.indexOf("---");
      english =
        english ||
        (separatorIndex >= 0 && lines[separatorIndex + 2]
          ? lines[separatorIndex + 2]?.trim() || "unknown"
          : "unknown");
    }

    if (word === "unknown" || english === "unknown") {
      console.log(`⚠️  Skipping ${card.id} - missing word or translation`);
      return false;
    }

    return true;
  });

  console.log(
    `\n📸 Generating images for ${cardsNeedingImages.length} cards...`,
  );

  // Process cards with concurrency limit
  const results = await Promise.all(
    cardsNeedingImages.map((card) =>
      limit(async () => {
        const imagePath = `${IMAGES_DIR}/${card.id}.png`;

        // Try to extract from fields first (template-based cards)
        let word = card.fields?.name?.value || card.fields?.word?.value || "";
        let english =
          card.fields?.["Vj1QoXZ7"]?.value ||
          card.fields?.english?.value ||
          card.fields?.translation?.value ||
          "";

        // If no fields, parse from content (markdown cards)
        if (!word || !english) {
          const lines = card.content.split("\n");
          const wordLine = lines.find((line) => line.startsWith("## "));
          word = word || wordLine?.replace("## ", "").trim() || "";

          // Translation is typically after the --- separator
          const separatorIndex = lines.indexOf("---");
          english =
            english ||
            (separatorIndex >= 0 && lines[separatorIndex + 2]
              ? lines[separatorIndex + 2]?.trim() || ""
              : "");
        }

        console.log(`🎨 Starting: ${card.id} - ${word} (${english})`);

        await generateImage({
          word,
          english,
          outputPath: imagePath,
          quality: "high", // Use medium quality to balance cost and quality
        });

        console.log(`✅ Saved: ${imagePath}`);
        return card.id;
      }),
    ),
  );

  console.log("\n✨ Image generation complete!");
  console.log(`📊 Generated ${results.length} images`);
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
