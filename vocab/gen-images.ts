#!/usr/bin/env bun

// Generate images for Swedish vocabulary entries
// Uses mochiId from JSON data as filenames to maintain consistency with Mochi cards

import { generateImage } from "../image-gen/generate-images";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import pLimit from "p-limit";
import swedishCoreData from "./swedish-core.json";
import { z } from "zod";

const VocabEntry = z.object({
  word: z.string(),
  english: z.string(),
  mochiId: z.string().optional(),
  imageHint: z.string().optional(),
});

const IMAGES_DIR = "./images";
const CONCURRENCY = 1; // Process 5 images at a time
const limit = pLimit(CONCURRENCY);

async function ensureImagesDir() {
  if (!existsSync(IMAGES_DIR)) {
    await mkdir(IMAGES_DIR, { recursive: true });
  }
}

async function generateVocabularyImages() {
  await ensureImagesDir();

  console.log("Loading Swedish Core vocabulary data...");
  const data = z.array(VocabEntry).parse(swedishCoreData);
  console.log(`Found ${data.length} vocabulary entries`);

  // Filter entries that need images
  const entriesNeedingImages = data.filter((entry) => {
    if (!entry.mochiId) {
      console.log(`⚠️  [${entry.word}] skipping - no mochiId`);
      return false;
    }

    const imagePath = `${IMAGES_DIR}/${entry.mochiId}.png`;
    if (existsSync(imagePath)) {
      console.log(`⏭️  [${entry.word}] skipping - image already exists`);
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
          `🎨 [${entry.word}] starting (${entry.mochiId}) - ${entry.english}`,
        );

        await generateImage({
          word: entry.word,
          english: entry.english,
          outputPath: imagePath,
          imageHint: entry.imageHint,
        });

        console.log(`✅ [${entry.word}] saved ${imagePath}`);
        return entry.mochiId;
      }),
    ),
  );

  console.log("\n✨ Image generation complete!");
  console.log(`📊 Generated ${results.length} images`);
}

export { generateVocabularyImages };

// Run the script
if (import.meta.main) {
  if (!Bun.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  await generateVocabularyImages();
  process.exit(0);
}
