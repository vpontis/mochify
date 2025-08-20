#!/usr/bin/env bun

// Test script to debug GPT-5-mini text generation issues
import OpenAI from "openai";
import { dedent } from "./utils";

const openai = new OpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
});

async function testGPT5Mini() {
  console.log("🧪 Testing GPT-5-mini with various prompts...\n");

  const testCases = [
    {
      name: "Simple test",
      messages: [{ role: "user" as const, content: "Say hello" }],
    },
    {
      name: "Scene description (our use case)",
      messages: [
        {
          role: "system" as const,
          content:
            "You create scene descriptions for vocabulary illustrations.",
        },
        {
          role: "user" as const,
          content:
            "Create a scene description for the Swedish word 'bil' meaning 'car'.",
        },
      ],
    },
    {
      name: "Full prompt (exactly what we use)",
      messages: [
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
            
            Nouns (a/an + object):
            - For "a car": "A car in a magical forest setting with a cute 5-month-old baby with short black hair playing nearby"
            
            Describe the scene using visual descriptions of people (not names), objects, and actions.
          `,
        },
        {
          role: "user" as const,
          content: dedent`
            Create a scene description for the Swedish word "hej" meaning "hello".

            Describe a specific scene that visually represents this concept.
            Use descriptions like "a woman with black hair" or "a baby" instead of names.
          `,
        },
      ],
    },
  ];

  for (const testCase of testCases) {
    console.log(`🔸 Test: ${testCase.name}`);
    console.log(`📝 Messages:`, JSON.stringify(testCase.messages, null, 2));

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: testCase.messages,
        max_completion_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      console.log(`✅ Response: "${content}"`);
      console.log(`📊 Response length: ${content?.length || 0} characters`);

      // Log full response object for debugging
      console.log(
        `🔍 Full response object:`,
        JSON.stringify(response, null, 2),
      );
    } catch (error) {
      console.log(`❌ Error:`, error);
    }

    console.log(`\n${"=".repeat(50)}\n`);
  }
}

// Test with different model names to see if we're using the wrong model ID
async function testDifferentModels() {
  console.log("🔬 Testing different model names...\n");

  const models = ["gpt-5-mini", "gpt-4o-mini", "gpt-4o", "gpt-4"];

  for (const model of models) {
    console.log(`🔸 Testing model: ${model}`);

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "user", content: "Say 'test' and the model name you are." },
        ],
        max_completion_tokens: 50,
      });

      const content = response.choices[0]?.message?.content;
      console.log(`✅ ${model} response: "${content}"`);
    } catch (error: any) {
      console.log(`❌ ${model} error: ${error.message || error}`);
    }

    console.log();
  }
}

// Run tests
if (import.meta.main) {
  if (!Bun.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  await testGPT5Mini();
  await testDifferentModels();
}
