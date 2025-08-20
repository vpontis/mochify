// OpenAI GPT-Image-1 Generation (Latest model as of 2025)
// Released April 2025, based on GPT-4o's multimodal capabilities
// - Supports up to 4096x4096 resolution
// - Better text rendering and world knowledge
// - Pricing: ~$0.02 (low), $0.07 (medium), $0.19 (high) per image
// Reference: https://platform.openai.com/docs/guides/image-generation

import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
});

export interface ImageGenerationOptions {
  word: string;
  english: string;
  context?: string;
  outputPath: string;
  quality?: "low" | "medium" | "high" | "auto";
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
}

export async function generateImage({
  word,
  english,
  context,
  outputPath,
  quality = "high",
  size = "1536x1024",
}: ImageGenerationOptions): Promise<string> {
  // Characters for consistency across images
  const characters = `
    Characters (choose 1-3 as appropriate, NO TEXT OR NAMES in the image):
    - Marissa: 32-year-old woman with black hair, pale skin, and blue eyes
    - Victor: 32-year-old man with dark blonde/light brown hair, fair skin, and brown eyes  
    - Stellan: 5-month-old baby with dark brown hair, very cute and cheerful
  `;

  const prompt = `Studio Ghibli style illustration showing "${english}". 
    ${characters}
    The scene should naturally demonstrate the concept without any text or labels.
    Warm, magical atmosphere with soft lighting typical of Studio Ghibli films.
    Hand-drawn animation aesthetic with rich details and expressive characters.
    ${context ? `Scene context: ${context.slice(0, 100)}` : ""}`;

  console.log(`🔄 API call for ${word} (${english})...`);

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1", // Latest model (2025) with better capabilities
      prompt,
      n: 1, // GPT-Image-1 only supports n=1 currently
      size,
      quality,
    });

    console.log(`📡 API response received`);

    let buffer: ArrayBuffer;

    // Check if we got a URL or base64 data
    if (response.data?.[0]?.url) {
      const imageUrl = response.data[0].url;
      console.log(`⬇️ Downloading from URL: ${imageUrl.slice(0, 50)}...`);
      const imageResponse = await fetch(imageUrl);
      buffer = await imageResponse.arrayBuffer();
    } else if (response.data?.[0]?.b64_json) {
      console.log(`📦 Converting base64 image...`);
      const base64Data = response.data[0].b64_json;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes.buffer;
    } else {
      throw new Error("No image data returned (neither URL nor base64)");
    }

    console.log(`💾 Writing ${buffer.byteLength} bytes to ${outputPath}`);
    // Save to local file
    await Bun.write(outputPath, buffer);

    console.log(`✅ Successfully saved ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Failed to generate image for ${word}:`, error);
    throw error;
  }
}

// Example usage when run directly
async function main() {
  const testWord = {
    word: "Hej",
    english: "Hello",
    context: "friendly greeting between people",
    outputPath: "./images/test-hej.png",
  };

  try {
    await generateImage(testWord);
    console.log("\n✨ Image generation complete!");
  } catch (error) {
    console.error("Failed to generate test image:", error);
  }
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
