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
}

export async function generateImage({
  word,
  english,
  outputPath,
  quality = "high",
  size = "1536x1024",
}: ImageGenerationOptions): Promise<string> {
  console.log(`🎯 Creating prompt for ${word} (${english})...`);

  // First, use GPT-5-mini to create a creative scene description
  const promptCreationMessages = [
    {
      role: "system" as const,
      content: dedent`
        You create scene descriptions for vocabulary illustrations. Available characters to describe (don't use names in output):
        - A 32yo woman with black hair, pale skin, and blue eyes
        - A 32yo man with dark blonde/light brown hair, fair skin, and brown eyes  
        - A 5-month-old baby with short black hair, very cute and cheerful

        Create varied scenes - sometimes use just the baby, sometimes a parent and baby, sometimes both parents, sometimes no people at all.
        
        Examples of good scene descriptions by word type:
        
        Verbs (to + action):
        - For "to be": "A 32-year-old man with light brown hair and a 32-year-old woman with black hair demonstrating the action of being together, with magical sparkles around them"
        - For "to have": "A 32-year-old woman with black hair holding magical objects while her 5-month-old baby with short black hair reaches for them"
        
        Nouns (a/an + object):
        - For "a car": "A car in a magical forest setting with a cute 5-month-old baby with short black hair playing nearby"
        - For "a house": "A house in an enchanted meadow with a 32-year-old man with light brown hair standing in the doorway"
        
        Greetings/Social:
        - For "hello": "A 32-year-old woman with black hair and her 5-month-old baby with short black hair waving happily, surrounded by floating flowers and butterflies"
        - For "thanks": "A family showing gratitude with glowing hearts floating around them"
        
        Question words:
        - For "when": "A curious 5-month-old baby with short black hair looking up at floating magical clocks and time symbols made of light"
        - For "where": "A 32-year-old woman with black hair pointing toward multiple floating magical doorways in the sky"
        
        Abstract concepts:
        - For other words: "A family scene with a 32-year-old man with light brown hair, 32-year-old woman with black hair, and 5-month-old baby with short black hair, surrounded by magical elements representing the concept"
        
        Describe the scene using visual descriptions of people (not names), objects, and actions.
      `,
    },
    {
      role: "user" as const,
      content: dedent`
        Create a scene description for the Swedish word "${word}" meaning "${english}".

        Describe a specific scene that visually represents this concept.
        Use descriptions like "a woman with black hair" or "a baby" instead of names.
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
  // We handle the style and "no text" instructions - GPT just provides the creative scene
  const prompt = dedent`
    ${sceneDescription}
    
    Style: Studio Ghibli animation, hand-drawn, soft watercolor textures, warm lighting.
    Atmosphere: Magical, whimsical, peaceful, dreamlike quality.
    Important: No text, letters, words, or numbers anywhere in the image.
    Details: Rich environmental details, expressive character emotions if people are present.
    Composition: Clear focal point, balanced, cinematic framing.
  `;

  console.log(`📝 Scene: ${sceneDescription}`);
  console.log(`🎨 Full prompt being sent to image API:`);
  console.log(prompt);
  console.log(`🔄 Creating image...`);

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
