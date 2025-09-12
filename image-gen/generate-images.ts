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
  const tag = `[${word}]`;
  console.log(`${tag} drafting scene...`);

  // Build a single user message to create a concise scene description
  const hintLine = imageHint
    ? `Start from this hint and elaborate with concrete visuals: "${imageHint}".`
    : `If helpful, invent a simple, filmable scene that clearly depicts the concept.`;

  const promptCreationMessages = [
    {
      role: "system" as const,
      content: dedent`
        You write compact, filmable scene descriptions for illustration prompts.
        Output only 2–4 sentences of visual description. No meta commentary.
        Keep variety across cards; use people, baby, or environment-only as appropriate.
        Avoid brand names and on-image text.
      `,
    },
    {
      role: "user" as const,
      content: dedent`
        Swedish word: "${word}" — meaning: "${english}".
        ${hintLine}
        Write 2–4 sentences describing a specific, observable scene that conveys the meaning.
      `,
    },
  ];

  console.log(`${tag} asking GPT-5-mini...`);

  let sceneDescription: string;
  try {
    const promptResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: promptCreationMessages,
      temperature: 0.7,
      max_completion_tokens: 250,
    });

    sceneDescription =
      promptResponse.choices[0]?.message?.content?.trim() || "";
    if (sceneDescription.length > 0) {
      if (Bun.env.DEBUG_IMAGE_PROMPTS === "1") {
        console.log(`${tag} scene: ${sceneDescription}`);
      } else {
        console.log(`${tag} scene ready`);
      }
    }
  } catch (error) {
    console.log(`${tag} ⚠️ GPT-5-mini error: ${error}`);
    sceneDescription = "";
  }

  // Fallback if GPT returns no scene
  if (!sceneDescription || sceneDescription.trim().length === 0) {
    const base = imageHint
      ? `A filmable scene: ${imageHint}.`
      : `An everyday scene illustrating "${english}": an adult and a baby interact with a single clear prop.`;
    const detail = `Keep it grounded, with a clear focal action and readable lighting.`;
    sceneDescription = `${base} ${detail}`;
    console.log(`${tag} using fallback scene`);
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

  if (Bun.env.DEBUG_IMAGE_PROMPTS === "1") {
    console.log(`📝 ${tag} scene: ${sceneDescription}`);
  }
  // Constructed prompt ready; omitting verbose logging
  console.log(`${tag} creating image...`);

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
      console.log(`⬇️ ${tag} downloading image`);
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

    console.log(`✅ ${tag} saved ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`${tag} failed to generate image:`, error);
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
