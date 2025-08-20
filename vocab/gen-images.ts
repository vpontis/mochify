#!/usr/bin/env bun

// Generate images for Swedish vocabulary entries
// Uses mochiId from JSON data as filenames to maintain consistency with Mochi cards

import { generateImage } from "../image-gen/generate-images";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import pLimit from "p-limit";
import swedishCoreData from "./swedish-core.json";

const IMAGES_DIR = "./images";
const CONCURRENCY = 5; // Process 5 images at a time
const limit = pLimit(CONCURRENCY);

async function ensureImagesDir() {
  if (!existsSync(IMAGES_DIR)) {
    await mkdir(IMAGES_DIR, { recursive: true });
  }
}

async function main() {
  console.log("Loading Swedish Core vocabulary data...");
  console.log(`Found ${swedishCoreData.length} vocabulary entries`);

  // Filter entries that need images
  const entriesNeedingImages = swedishCoreData.filter((entry) => {
    if (!entry.mochiId) {
      console.log(`⚠️  Skipping "${entry.word}" - no mochiId`);
      return false;
    }

    const imagePath = `${IMAGES_DIR}/${entry.mochiId}.png`;
    if (existsSync(imagePath)) {
      console.log(`⏭️  Skipping ${entry.mochiId} - image already exists`);
      return false;
    }

    return true;
  });

  console.log(
    `\n📸 Generating images for ${entriesNeedingImages.length} vocabulary entries...`,
  );

  // Process entries with concurrency limit
  const results = await Promise.all(
    entriesNeedingImages.map((entry) =>
      limit(async () => {
        const imagePath = `${IMAGES_DIR}/${entry.mochiId}.png`;

        console.log(
          `🎨 Starting: ${entry.mochiId} - ${entry.word} (${entry.english})`,
        );

        await generateImage({
          word: entry.word,
          english: entry.english,
          outputPath: imagePath,
          quality: "high",
        });

        console.log(`✅ Saved: ${imagePath}`);
        return entry.mochiId;
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

  await ensureImagesDir();
  main().catch(console.error);
}
