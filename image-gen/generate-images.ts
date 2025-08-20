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
  // Using detailed prompts as recommended by OpenAI documentation for better results
  // The API uses GPT-4 to rewrite prompts automatically for optimization
  const prompt = `Create a Studio Ghibli-inspired illustration for the Swedish word "${word}" which means "${english}" in English. 
    
    Style requirements:
    - Hand-drawn watercolor aesthetic reminiscent of Hayao Miyazaki's films
    - Soft, muted color palette with gentle gradients
    - Whimsical and dreamlike atmosphere
    - Include small magical or fantastical elements typical of Ghibli films
    - Characters (if present) should have the distinctive Ghibli art style with expressive eyes
    
    Scene composition:
    - ${context ? `The scene should incorporate: ${context}` : "Set in a peaceful natural environment or cozy interior"}
    - Include visual elements that help convey the meaning of "${english}"
    - Add subtle details like floating particles of light, gentle wind effects, or small creatures
    - The overall mood should be warm, nostalgic, and emotionally evocative
    
    Make the image feel like a still frame from a Studio Ghibli film, with attention to atmospheric lighting and environmental storytelling.`;

  console.log(`Generating image for ${word} (${english})...`);

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1", // Latest model (2025) with better capabilities
      prompt,
      n: 1, // GPT-Image-1 only supports n=1 currently
      size,
      quality,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned");

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();

    // Save to local file
    await Bun.write(outputPath, buffer);

    console.log(`✓ Saved ${outputPath}`);
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
