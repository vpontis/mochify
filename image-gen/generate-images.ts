// OpenAI GPT-Image-1 Generation (Latest model as of 2025)
// Released April 2025, based on GPT-4o's multimodal capabilities
// - Supports up to 4096x4096 resolution
// - Better text rendering and world knowledge
// - Pricing: ~$0.02 (low), $0.07 (medium), $0.19 (high) per image
// Reference: https://platform.openai.com/docs/guides/image-generation

import OpenAI from "openai";
import { z } from "zod";
import { dedent } from "../utils";

const openai = new OpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
});

export interface ImageGenerationOptions {
  word: string;
  english: string;
  outputPath: string;
  quality?: "low" | "medium" | "high" | "auto";
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  imageHint?: string;
}

export async function generateImage({
  word,
  english,
  outputPath,
  quality = "high",
  size = "1536x1024",
  imageHint,
}: ImageGenerationOptions): Promise<string> {
  console.log(`🎯 Creating prompt for ${word} (${english})...`);

  // Build a single user message to create a concise scene description
  const hintLine = imageHint
    ? `Start from this hint and elaborate with concrete visuals: "${imageHint}".`
    : `If helpful, invent a simple, filmable scene that clearly depicts the concept.`;

  const promptCreationMessages = [
    {
      role: "user" as const,
      content: dedent`
        Create a concise visual scene (2–4 sentences) for an illustration of the Swedish word "${word}" meaning "${english}".
        ${hintLine}
        Keep variety high across cards: it's okay to use people, a baby, or no people; choose what best communicates the concept and avoid repeating the same family setup.
        The scene must be specific, observable, and easy to draw (no brand names, no on-image text).
      `,
    },
  ];

  console.log(`💭 Asking GPT-5-mini for scene...`);

  let sceneDescription: string;
  try {
    const promptResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: promptCreationMessages,
      max_completion_tokens: 1000, // Higher limit since GPT-5-mini uses tokens for reasoning internally
    });

    sceneDescription = promptResponse.choices[0]?.message?.content || "";
    console.log(`🤖 GPT-5-mini response: "${sceneDescription}"`);
  } catch (error) {
    console.log(`⚠️ GPT-5-mini error: ${error}`);
    sceneDescription = "";
  }

  // Throw error if GPT-5-mini fails to provide a scene description
  if (!sceneDescription || sceneDescription.trim().length === 0) {
    throw new Error(
      `GPT-5-mini failed to generate a scene description for "${word}" (${english})`,
    );
  }

  // Combine the creative scene from GPT with our technical requirements
  const prompt = dedent`
    ${sceneDescription}
    
    Style: Studio Ghibli animation, hand-drawn, soft watercolor textures, warm lighting.
    Atmosphere: Magical, whimsical, peaceful, dreamlike quality.
    Important: No text, letters, words, or numbers anywhere in the image.
    Details: Rich environmental details, expressive character emotions if people are present.
    Composition: Clear focal point, balanced, cinematic framing.
  `;

  console.log(`📝 Scene: ${sceneDescription}`);
  // Constructed prompt ready; omitting verbose logging
  console.log(`🔄 Creating image...`);

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1", // Latest model (2025) with better capabilities
      prompt,
      n: 1, // GPT-Image-1 only supports n=1 currently
      size,
      quality,
    });

    let buffer: ArrayBuffer;

    // Check if we got a URL or base64 data
    if (response.data?.[0]?.url) {
      const imageUrl = response.data[0].url;
      console.log(`⬇️ Downloading from URL: ${imageUrl.slice(0, 50)}...`);
      const imageResponse = await fetch(imageUrl);
      buffer = await imageResponse.arrayBuffer();
    } else if (response.data?.[0]?.b64_json) {
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
