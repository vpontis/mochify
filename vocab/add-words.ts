#!/usr/bin/env bun

/**
 * AI-powered Swedish vocabulary adder
 * Just provide Swedish words - AI generates everything else
 *
 * Usage:
 *   bun vocab/add-words.ts hej tack fika lagom
 *   bun vocab/add-words.ts --kelly 20  # Next 20 from Kelly list
 *   echo "hej tack fika" | bun vocab/add-words.ts
 */

import OpenAI from "openai";
import { parse } from "csv-parse/sync";

interface VocabWord {
  word: string;
  english: string;
  examples: string;
  audio: string;
  tags: string[];
  notes: string;
  mochiId?: string;
  imageHint?: string;
}

interface GeneratedEntry {
  word: string;
  english: string;
  definition: string;
  grammar: string;
  examples: Array<{ swedish: string; english: string }>;
  usage: string;
  imageHint: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateVocabEntry(
  word: string,
): Promise<GeneratedEntry | null> {
  try {
    const prompt = `Generate a comprehensive Swedish vocabulary entry for the word "${word}".

Return a JSON object with this exact structure:
{
  "word": "${word}",
  "english": "concise translation(s)",
  "definition": "Brief explanation of meaning and usage",
  "grammar": "Grammar info (verb conjugation, noun gender/plural, etc)",
  "examples": [
    {"swedish": "Example sentence", "english": "Translation"},
    {"swedish": "Another example", "english": "Translation"}
  ],
  "usage": "Usage notes, frequency, register (formal/informal), contexts",
  "imageHint": "6-10 word scene description for image generation (no people)"
}

Make examples natural and practical. Include cultural context if relevant.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Swedish language expert. Generate accurate, practical vocabulary entries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    return JSON.parse(content) as GeneratedEntry;
  } catch (error) {
    console.error(`❌ Failed to generate entry for "${word}":`, error);
    return null;
  }
}

function convertToVocabWord(entry: GeneratedEntry): VocabWord {
  // Build examples string
  const examplesText = entry.examples
    .slice(0, 3)
    .map((ex) => `${ex.swedish}\n(${ex.english})`)
    .join("\n\n");

  // Build audio from Swedish sentences only
  const audioText = entry.examples.map((ex) => ex.swedish).join(" ");

  // Build notes
  const notesParts: string[] = [];
  if (entry.grammar) {
    notesParts.push(entry.grammar);
  }
  if (entry.definition && entry.definition !== entry.english) {
    notesParts.push(entry.definition);
  }
  if (entry.usage) {
    notesParts.push(entry.usage);
  }

  return {
    word: entry.word,
    english: entry.english,
    examples: examplesText,
    audio: audioText,
    tags: ["swedish"],
    notes: notesParts.join("; "),
    imageHint: entry.imageHint,
  };
}

async function getKellyWords(count: number = 20): Promise<string[]> {
  const kellyCSV = await Bun.file("vocab/kelly-swedish.csv").text();
  const swedishCore: VocabWord[] = await Bun.file(
    "vocab/swedish-core.json",
  ).json();

  const kellyWords = parse(kellyCSV, {
    columns: true,
    skip_empty_lines: true,
  });

  const existingWords = new Set(
    swedishCore
      .map((item) => {
        const word = item.word.toLowerCase();
        const variants = word.split("/").map((w) => w.trim());
        return variants;
      })
      .flat(),
  );

  const newWords: string[] = [];

  for (const row of kellyWords) {
    const word = row["Lemma"]?.toLowerCase().trim();
    const pos = row["POS"];
    const rank = parseInt(row["ID"]) || 0;

    if (!word || existingWords.has(word)) continue;
    if (word.includes("(") || word.includes(".") || word.includes(","))
      continue;
    if (["proper name", "numeral"].includes(pos)) continue;
    if (rank < 200) continue;

    newWords.push(word);
    if (newWords.length >= count) break;
  }

  return newWords;
}

async function processWords(words: string[]) {
  console.log(
    `🤖 Using AI to generate comprehensive entries for ${words.length} Swedish words...\n`,
  );

  const swedishCore: VocabWord[] = await Bun.file(
    "vocab/swedish-core.json",
  ).json();
  const existingWords = new Set(
    swedishCore.map((item) => item.word.toLowerCase()),
  );

  const newEntries: VocabWord[] = [];
  const failedWords: string[] = [];

  for (const word of words) {
    const cleanWord = word.toLowerCase().trim();

    if (!cleanWord) continue;

    if (existingWords.has(cleanWord)) {
      console.log(`⏭️  Skipping "${cleanWord}" - already exists`);
      continue;
    }

    process.stdout.write(`📝 Generating "${cleanWord}"...`);
    const generated = await generateVocabEntry(cleanWord);

    if (generated) {
      const vocabEntry = convertToVocabWord(generated);
      newEntries.push(vocabEntry);
      console.log(` ✅`);
      console.log(`   → ${generated.english}`);
      console.log(`   → ${generated.definition}`);
    } else {
      failedWords.push(cleanWord);
      console.log(` ❌`);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (newEntries.length === 0) {
    console.log("\n⚠️  No new words were added");
    if (failedWords.length > 0) {
      console.log(`Failed words: ${failedWords.join(", ")}`);
    }
    return;
  }

  // Save to file
  const updatedVocab = [...swedishCore, ...newEntries];
  await Bun.write(
    "vocab/swedish-core.json",
    JSON.stringify(updatedVocab, null, 2),
  );

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successfully added: ${newEntries.length} words`);
  if (failedWords.length > 0) {
    console.log(
      `  ❌ Failed: ${failedWords.length} words (${failedWords.join(", ")})`,
    );
  }
  console.log(`  📚 Total vocabulary: ${updatedVocab.length} words`);

  return newEntries;
}

async function syncToMochi() {
  console.log("\n🔄 Syncing to Mochi...");
  const proc = Bun.spawn(["bun", "vocab/sync-swedish-vocabulary.ts"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function generateImages() {
  console.log("\n🎨 Generating images...");
  const proc = Bun.spawn(["bun", "vocab/gen-images.ts"], {
    env: { ...process.env },
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable is required");
    console.error("Set it in your .env file or export it in your shell");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
AI-Powered Swedish Vocabulary Manager

Usage:
  bun vocab/add-words.ts word1 word2 word3...     # Add specific words
  bun vocab/add-words.ts --kelly <count>          # Add next N words from Kelly list
  echo "word1 word2" | bun vocab/add-words.ts     # Pipe in words
  bun vocab/add-words.ts --sync-only              # Just sync existing words

Options:
  --kelly <n>    Add next n words from Kelly frequency list
  --sync-only    Just sync to Mochi without adding new words
  --no-sync      Skip syncing to Mochi
  --no-images    Skip image generation
  --help         Show this help message

Examples:
  bun vocab/add-words.ts hej tack fika lagom
  bun vocab/add-words.ts --kelly 20
  cat words.txt | bun vocab/add-words.ts

The AI will automatically generate:
  • English translations
  • Definitions and explanations
  • Grammar information (gender, conjugations, etc.)
  • Natural example sentences
  • Usage notes and context
  • Image generation hints

Note: Requires OPENAI_API_KEY in environment
`);
    return;
  }

  if (args.includes("--sync-only")) {
    await syncToMochi();
    if (!args.includes("--no-images")) {
      await generateImages();
      await syncToMochi();
    }
    return;
  }

  let words: string[] = [];

  // Check for Kelly list option
  const kellyIndex = args.indexOf("--kelly");
  if (kellyIndex !== -1) {
    const count = parseInt(args[kellyIndex + 1]) || 20;
    words = await getKellyWords(count);
    console.log(`📚 Selected ${words.length} words from Kelly list`);
  } else {
    // Get words from arguments (excluding flags)
    words = args.filter((arg) => !arg.startsWith("--"));

    // If no words in arguments, try reading from stdin
    if (words.length === 0 && !process.stdin.isTTY) {
      const input = await Bun.stdin.text();
      words = input.split(/\s+/).filter((w) => w.length > 0);
    }
  }

  if (words.length === 0) {
    console.log("No words provided. Use --help for usage information.");
    return;
  }

  console.log(
    `🚀 Processing ${words.length} Swedish words: ${words.join(", ")}\n`,
  );

  const newEntries = await processWords(words);

  if (newEntries && newEntries.length > 0 && !args.includes("--no-sync")) {
    await syncToMochi();

    if (!args.includes("--no-images")) {
      await generateImages();
      await syncToMochi(); // Sync again to add images
    }

    console.log("\n✨ Complete! Your Swedish vocabulary has been enriched.");
  }
}

await main();
