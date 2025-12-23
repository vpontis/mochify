#!/usr/bin/env bun

/**
 * AI-powered Swedish vocabulary adder
 * Just provide Swedish words - AI generates everything else
 *
 * Usage:
 *   bun vocab/add-words.ts hej tack fika lagom
 *   bun vocab/add-words.ts --kelly 20  # Next 20 from Kelly list
 *   bun vocab/add-words.ts --deck eGLrOJfM word1 word2  # Add to specific deck
 *   echo "hej tack fika" | bun vocab/add-words.ts
 */

import OpenAI from "openai";
import { parse } from "csv-parse/sync";
import { dedent, writeFormattedJSON, MochiClient } from "../utils";
import { Command } from "commander";
import { existsSync } from "node:fs";
import pLimit from "p-limit";

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

// Mochi template configuration
const VOCABULARY_TEMPLATE_ID = "GAFwzU5S";
const FIELD_IDS = {
  word: "name",
  english: "Vj1QoXZ7",
  examples: "mknO4gtZ",
  audio: "nRezTqnS",
  notes: "c64dCRkt",
};

// Write lock for serializing JSON file writes
const writeLock = pLimit(1);

// Mochi sync lock - only allow one Mochi API request at a time due to rate limiting
const mochiSyncLimit = pLimit(1);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateVocabEntry(
  word: string,
): Promise<GeneratedEntry | null> {
  try {
    const prompt = dedent`
      Generate a Swedish vocabulary entry for the word "${word}".

      Return a JSON object with this exact structure:
      {
        "word": "${word}",
        "english": "concise translation(s)",
        "definition": "Brief explanation of meaning",
        "grammar": "SHORT grammar note ONLY - examples: 'vet/visste/vetat (irregular verb)' or 'en bok, boken, böcker (common noun)' or 'god/gott/goda (adjective)'",
        "examples": [
          {"swedish": "Example sentence", "english": "Translation"},
          {"swedish": "Another example", "english": "Translation"}
        ],
        "usage": "Brief usage note if important",
        "imageHint": "6-10 word scene description for image generation (no people)"
      }

      IMPORTANT:
      - grammar must be a SHORT STRING (max 80 chars) with conjugations/forms only
      - Examples should be natural and practical
      - Keep it concise
    `;

    const response = await openai.responses.create({
      model: "gpt-5.2",
      reasoning: { effort: "medium" },
      instructions:
        "You are a Swedish language expert. Generate accurate, practical vocabulary entries. Keep grammar notes SHORT and concise (max 80 chars). Focus on essential conjugations/declensions only.",
      input: prompt,
      text: { format: { type: "json_object" } },
    });

    const content = response.output_text;
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

  // Build notes - ONLY use grammar field, keep it concise
  let notes = entry.grammar || "";

  // Add brief usage note only if it's truly important and short
  if (
    entry.usage &&
    entry.usage.length < 60 &&
    !entry.usage.toLowerCase().includes("commonly used")
  ) {
    notes = notes ? `${notes}; ${entry.usage}` : entry.usage;
  }

  return {
    word: entry.word,
    english: entry.english,
    examples: examplesText,
    audio: audioText,
    tags: ["swedish"],
    notes: notes,
    imageHint: entry.imageHint,
  };
}

async function saveWord(vocabEntry: VocabWord, vocabFile: string) {
  return writeLock(async () => {
    const file = Bun.file(vocabFile);
    let vocab: VocabWord[] = [];

    if (await file.exists()) {
      vocab = await file.json();
    }

    const index = vocab.findIndex((v) => v.word === vocabEntry.word);
    if (index >= 0) {
      vocab[index] = vocabEntry; // Update existing
    } else {
      vocab.push(vocabEntry); // Add new
    }

    await writeFormattedJSON(vocabFile, vocab);
  });
}

async function syncToMochi(
  client: MochiClient,
  deckId: string,
  item: VocabWord,
): Promise<{ action: "created" | "updated"; cardId: string }> {
  // Check if image exists
  const imagePath = `./images/${item.mochiId}.png`;
  let notesWithImage = item.notes || "";

  if (item.mochiId && existsSync(imagePath)) {
    const imageUrl = `https://raw.githubusercontent.com/vpontis/mochify/refs/heads/master/images/${item.mochiId}.png`;
    notesWithImage = notesWithImage
      ? `${notesWithImage}\n\n![${item.word}](${imageUrl})`
      : `![${item.word}](${imageUrl})`;
  }

  const fieldData = {
    [FIELD_IDS.word]: { id: FIELD_IDS.word, value: item.word },
    [FIELD_IDS.english]: { id: FIELD_IDS.english, value: item.english },
    [FIELD_IDS.examples]: { id: FIELD_IDS.examples, value: item.examples },
    [FIELD_IDS.audio]: { id: FIELD_IDS.audio, value: item.audio },
    [FIELD_IDS.notes]: { id: FIELD_IDS.notes, value: notesWithImage },
  };

  if (item.mochiId) {
    // Update existing card
    const card = await client.createCard({
      id: item.mochiId,
      content: "",
      "deck-id": deckId,
      "template-id": VOCABULARY_TEMPLATE_ID,
      fields: fieldData,
      tags: item.tags,
    });
    return { action: "updated", cardId: card.id };
  }

  // Create new card
  const card = await client.createCard({
    content: "",
    "deck-id": deckId,
    "template-id": VOCABULARY_TEMPLATE_ID,
    fields: fieldData,
    tags: item.tags,
  });

  // Update item with new ID
  item.mochiId = card.id;

  return { action: "created", cardId: card.id };
}

async function getKellyWords(count: number = 20): Promise<string[]> {
  const kellyCSV = await Bun.file("vocab/kelly-swedish.csv").text();
  const swedishCore: VocabWord[] = await Bun.file(
    "vocab/swedish-core.json",
  ).json();

  const kellyWords = parse(kellyCSV, {
    columns: true,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;

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
    const word = row["Word"]?.toLowerCase().trim();

    if (!word || existingWords.has(word)) continue;

    newWords.push(word);
    if (newWords.length >= count) break;
  }

  return newWords;
}

async function processWords(
  words: string[],
  vocabFile: string = "vocab/swedish-core.json",
  deckId?: string,
  deckName?: string,
) {
  console.log(
    `🤖 Processing ${words.length} Swedish words with AI generation and sync...\n`,
  );

  // Set up Mochi client and deck once at the start
  const client = new MochiClient(process.env.MOCHI_API_KEY!);

  let deck;
  if (deckId) {
    try {
      deck = await client.getDeck(deckId);
      console.log(`📚 Using deck: ${deck.name} (${deck.id})\n`);
    } catch (error) {
      console.error(`❌ Error: Deck ${deckId} not found`);
      process.exit(1);
    }
  } else {
    const decks = await client.listDecks();
    const targetDeckName = deckName || "Swedish Core";
    deck = decks.find((d) => d.name === targetDeckName);

    if (!deck) {
      deck = await client.createDeck({ name: targetDeckName });
      console.log(`✅ Created new deck: ${deck.name} (${deck.id})\n`);
    } else {
      console.log(`📚 Using deck: ${deck.name} (${deck.id})\n`);
    }
  }

  // Load existing vocabulary to check for duplicates
  let existingVocab: VocabWord[] = [];
  const file = Bun.file(vocabFile);
  if (await file.exists()) {
    existingVocab = await file.json();
  }

  const existingWords = new Set(
    existingVocab.map((item) => item.word.toLowerCase()),
  );

  // Filter out existing words
  const wordsToProcess = words
    .map((w) => w.toLowerCase().trim())
    .filter((w) => {
      if (!w) return false;
      if (existingWords.has(w)) {
        console.log(`⏭️  Skipping "${w}" - already exists`);
        return false;
      }
      return true;
    });

  if (wordsToProcess.length === 0) {
    console.log("\n⚠️  No new words to add");
    return;
  }

  console.log(
    `\n🚀 Processing ${wordsToProcess.length} words in parallel (AI gen → Mochi sync → JSON save)...\n`,
  );

  // Track stats
  const stats = {
    newEntries: [] as VocabWord[],
    failedWords: [] as string[],
  };

  // Process each word through full pipeline in parallel
  const processLimit = pLimit(10);

  await Promise.all(
    wordsToProcess.map((word) =>
      processLimit(async () => {
        try {
          // 1. AI Generation
          process.stdout.write(`📝 [${word}] Generating...`);
          const generated = await generateVocabEntry(word);

          if (!generated) {
            console.log(` ❌ Failed`);
            stats.failedWords.push(word);
            return;
          }

          const vocabEntry = convertToVocabWord(generated);
          console.log(` ✅`);
          console.log(`   → ${generated.english}`);

          // 2. Sync to Mochi (rate limited to 1 concurrent request)
          process.stdout.write(`   🔄 Syncing to Mochi...`);
          const syncResult = await mochiSyncLimit(() =>
            syncToMochi(client, deck.id, vocabEntry),
          );
          console.log(` ✅ (${syncResult.cardId})`);

          // 3. Save to JSON (with write lock)
          process.stdout.write(`   💾 Saving to JSON...`);
          await saveWord(vocabEntry, vocabFile);
          console.log(` ✅\n`);

          stats.newEntries.push(vocabEntry);
        } catch (error) {
          console.log(` ❌`);
          console.error(`   Error: ${error}\n`);
          stats.failedWords.push(word);
        }
      }),
    ),
  );

  // Re-read final vocabulary count
  const finalVocab: VocabWord[] = await Bun.file(vocabFile).json();

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successfully added: ${stats.newEntries.length} words`);
  if (stats.failedWords.length > 0) {
    console.log(
      `  ❌ Failed: ${stats.failedWords.length} words (${stats.failedWords.join(", ")})`,
    );
  }
  console.log(`  📚 Total vocabulary: ${finalVocab.length} words`);

  return { newEntries: stats.newEntries, vocabFile };
}

async function main() {
  const program = new Command();

  program
    .name("add-words")
    .description("AI-powered Swedish vocabulary manager")
    .argument("[words...]", "Swedish words to add")
    .option("-k, --kelly <count>", "Add next N words from Kelly frequency list")
    .option(
      "-d, --deck <deck-id>",
      "Deck ID to add words to (will create deck-specific JSON file)",
    )
    .option(
      "-n, --deck-name <name>",
      "Deck name (required with --deck for first use)",
    )
    .option("-l, --limit <count>", "Limit number of words to process")
    .action(async (inputWords: string[], options) => {
      let words: string[] = [];

      if (options.kelly) {
        const count = parseInt(options.kelly) || 20;
        words = await getKellyWords(count);
        console.log(`📚 Selected ${words.length} words from Kelly list`);
      } else if (inputWords.length > 0) {
        words = inputWords;
      } else if (!process.stdin.isTTY) {
        // Read from stdin if no args provided
        const input = await Bun.stdin.text();
        words = input.split(/\s+/).filter((w) => w.length > 0);
      }

      if (words.length === 0) {
        console.log("No words provided. Use --help for usage information.");
        return;
      }

      // Apply limit if specified
      if (options.limit) {
        const limit = parseInt(options.limit);
        if (words.length > limit) {
          console.log(
            `⚠️  Limiting to first ${limit} words (total: ${words.length})`,
          );
          words = words.slice(0, limit);
        }
      }

      // Determine vocab file and deck info
      let vocabFile = "vocab/swedish-core.json";
      let deckId: string | undefined;
      let deckName: string | undefined;

      if (options.deck) {
        deckId = options.deck;
        // Create a filename based on deck ID
        vocabFile = `vocab/deck-${deckId}.json`;

        // Check if we need deck name (for new files)
        const file = Bun.file(vocabFile);
        if (!(await file.exists()) && !options.deckName) {
          console.error(
            "❌ Error: --deck-name is required when creating a new deck file",
          );
          console.error(
            `   Example: bun vocab/add-words.ts --deck ${deckId} --deck-name "Svenska 1" word1 word2`,
          );
          process.exit(1);
        }
        deckName = options.deckName;

        console.log(`📂 Using deck-specific file: ${vocabFile}`);
        if (deckName) {
          console.log(`📚 Deck: ${deckName} (${deckId})`);
        }
      }

      console.log(
        `🚀 Processing ${words.length} Swedish words: ${words.join(", ")}\n`,
      );

      const result = await processWords(words, vocabFile, deckId, deckName);

      if (result && result.newEntries.length > 0) {
        console.log("\n✨ Complete! Added", result.newEntries.length, "words");
      }
    });

  await program.parseAsync();
}

if (import.meta.main) {
  await main();
  process.exit(0);
}
