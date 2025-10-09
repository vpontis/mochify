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
  imageHint?: string;
}

function buildScenePrompt(
  word: string,
  english: string,
  imageHint?: string,
): string {
  const hintInstruction = imageHint
    ? `Start from this hint: "${imageHint}".`
    : "Invent a simple, memorable scene that clearly depicts the concept.";

  return dedent`
    Write 2–3 sentences describing a specific visual scene for the Swedish word "${word}" ("${english}").
    ${hintInstruction}
    Prefer using family characters: adult woman (32, black hair), adult man (32, dark blonde), and/or a 7‑month‑old baby (short black hair).
    You do *NOT* have to use all three characters.
    Keep it concrete and drawable. No text/letters/numbers in the image.
  `;
}

export async function generateImage({
  word,
  english,
  outputPath,
  imageHint,
}: ImageGenerationOptions): Promise<string> {
  // Step 1: Generate scene description
  const scenePrompt = buildScenePrompt(word, english, imageHint);

  const promptResponse = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [{ role: "user", content: scenePrompt }],
  });

  const sceneDescription =
    promptResponse.choices[0]?.message?.content?.trim() || "";
  console.log("Scene description:", sceneDescription);

  const characterCount = Math.floor(Math.random() * 4);

  // Step 2: Generate image with style instructions
  const imagePrompt = dedent`
    ${sceneDescription}
    
    Style: Studio Ghibli animation, hand-drawn, soft watercolor textures, warm lighting.
    Atmosphere: Magical, whimsical, peaceful, dreamlike quality.
    Important: No text, letters, words, or numbers anywhere in the image.
    Details: Rich environmental details, expressive character emotions if people are present.
    Composition: Clear focal point, balanced, cinematic framing.
    Characters: Use ${characterCount} characters if that makes sense.
  `;

  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024", // Options: "1024x1024" (square), "1536x1024" (landscape), "1024x1536" (portrait)
    quality: "high", // Options: "low", "medium", "high", or "auto"
  });

  // Step 3: Download and save image
  const imageData = imageResponse.data?.[0];
  if (!imageData) {
    throw new Error("No image data in response");
  }

  let buffer: Buffer | ArrayBuffer;

  if (imageData.url) {
    // URL format
    const response = await fetch(imageData.url);
    buffer = await response.arrayBuffer();
  } else if (imageData.b64_json) {
    // Base64 format
    buffer = Buffer.from(imageData.b64_json, "base64");
  } else {
    throw new Error("No image URL or base64 data in response");
  }

  await Bun.write(outputPath, buffer);
  return outputPath;
}

// Example usage when run directly
if (import.meta.main) {
  const testWord = {
    word: "Hej",
    english: "Hello",
    outputPath: "./images/test-hej.png",
  };

  await generateImage(testWord);
  console.log("\n✨ Image generation complete!");
}
