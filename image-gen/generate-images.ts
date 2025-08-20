#!/usr/bin/env bun

import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
});

const VocabItem = z.object({
  word: z.string(),
  english: z.string(),
  context: z.string().optional(),
});

type VocabItem = z.infer<typeof VocabItem>;

async function generateImage({
  word,
  english,
  context,
}: VocabItem): Promise<string> {
  const prompt = `Studio Ghibli style watercolor illustration of "${english}" (${word} in Swedish), 
    whimsical and peaceful scene, soft colors, hand-drawn animation aesthetic, 
    ${context ? `incorporating: ${context}` : "nature or everyday life setting"}`;

  console.log(`Generating image for ${word} (${english})...`);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) throw new Error("No image URL returned");

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();

    // Save to local file
    const fileName = `${word.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
    const filePath = `./images/${fileName}`;
    await Bun.write(filePath, buffer);

    console.log(`✓ Saved ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`Failed to generate image for ${word}:`, error);
    throw error;
  }
}

async function main() {
  // Test with just one image first
  const vocabulary: VocabItem[] = [
    {
      word: "Hej",
      english: "Hello",
      context: "friendly greeting between people",
    },
  ];

  // Rate limiting - DALL-E 3 has limits
  const DELAY_MS = 2000; // 2 seconds between requests

  for (const item of vocabulary) {
    try {
      await generateImage(item);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      console.error(`Skipping ${item.word} due to error`);
    }
  }

  console.log("\n✨ Image generation complete!");
}

// Run if called directly
if (import.meta.main) {
  if (!Bun.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    console.error("Add it to your .env file or export it in your shell");
    process.exit(1);
  }

  main().catch(console.error);
}
