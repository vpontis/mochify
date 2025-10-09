// OpenAI GPT-Image-1 Generation (Latest model as of 2025)
// Released April 2025, based on GPT-4o's multimodal capabilities
// - Supports up to 4096x4096 resolution
// - Better text rendering and world knowledge
// - Pricing: ~$0.02 (low), $0.07 (medium), $0.19 (high) per image
// Reference: https://platform.openai.com/docs/guides/image-generation

import OpenAI from "openai";
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

  // Build a single user message to create a concise scene description
  const forbidPeople = /environment only|no people/i.test(imageHint || "");
  const hintLine = imageHint
    ? `Start from this hint: "${imageHint}".`
    : "If helpful, invent a simple, filmable scene that clearly depicts the concept.";

  const promptCreationMessages = [
    {
      role: "user" as const,
      content: dedent`
        Write 2–3 sentences describing a specific, filmable visual scene for the Swedish word "${word}" ("${english}").
        ${hintLine}
        ${forbidPeople ? "No people — environment only." : "Prefer using the family characters: adult woman (32, black hair), adult man (32, dark blonde), and/or a 5‑month‑old baby (short black hair). Use descriptions, not names."}
        Keep it concrete and drawable. No text/letters/numbers in the image.
      `,
    },
  ];

  // Minimal logging; avoid chat debug output

  let sceneDescription: string;

  const promptResponse = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: promptCreationMessages,
    temperature: 0.7,
    max_completion_tokens: 250,
  });

  sceneDescription = promptResponse.choices[0]?.message?.content?.trim() || "";

  // Combine the scene with rendering requirements
  const prompt = dedent`
    ${sceneDescription}
    
    Style: Studio Ghibli animation, hand-drawn, soft watercolor textures, warm lighting.
    Atmosphere: Magical, whimsical, peaceful, dreamlike quality.
    Important: No text, letters, words, or numbers anywhere in the image.
    Details: Rich environmental details, expressive character emotions if people are present.
    Composition: Clear focal point, balanced, cinematic framing.
  `;

  // Minimal logging; no prompt echo

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
  return outputPath;
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
  await main();
  process.exit(0);
}
