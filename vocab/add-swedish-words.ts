#!/usr/bin/env bun

/**
 * Complete workflow for adding Swedish vocabulary words
 *
 * Usage:
 *   bun vocab/add-swedish-words.ts                    # Interactive mode
 *   bun vocab/add-swedish-words.ts --words "ord1,ord2,ord3"
 *   bun vocab/add-swedish-words.ts --kelly 30         # Add next 30 words from Kelly list
 */

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

interface WordToAdd {
  word: string;
  english: string;
  notes?: string;
  examples?: string;
}

// Common Swedish words with translations for easy addition
const COMMON_WORDS: WordToAdd[] = [
  {
    word: "acceptera",
    english: "to accept",
    notes: "verb; accepterar/accepterade/accepterat",
  },
  {
    word: "diskutera",
    english: "to discuss",
    notes: "verb; diskuterar/diskuterade/diskuterat",
  },
  {
    word: "internationell",
    english: "international",
    notes: "adjective; internationellt (neuter)",
  },
  {
    word: "europeisk",
    english: "European",
    notes: "adjective; europeiskt (neuter)",
  },
  { word: "förmodligen", english: "probably", notes: "adverb" },
  { word: "naturligtvis", english: "of course, naturally", notes: "adverb" },
  {
    word: "kraft",
    english: "power, strength, force",
    notes: "en kraft, krafter (plural)",
  },
  {
    word: "fördel",
    english: "advantage, benefit",
    notes: "en fördel, fördelar (plural)",
  },
  {
    word: "nackdel",
    english: "disadvantage, drawback",
    notes: "en nackdel, nackdelar (plural)",
  },
  { word: "särskilt", english: "especially, particularly", notes: "adverb" },
  {
    word: "tillräckligt",
    english: "enough, sufficiently",
    notes: "adverb/adjective",
  },
  { word: "möte", english: "meeting", notes: "ett möte, möten (plural)" },
  {
    word: "förklara",
    english: "to explain",
    notes: "verb; förklarar/förklarade/förklarat",
  },
  {
    word: "besluta",
    english: "to decide",
    notes: "verb; beslutar/beslutade/beslutat",
  },
  {
    word: "uppleva",
    english: "to experience",
    notes: "verb; upplever/upplevde/upplevt",
  },
];

function generateExamples(
  word: string,
  english: string,
  notes: string,
): string {
  const isVerb = notes.includes("verb");
  const isAdjective = notes.includes("adjective");
  const isAdverb = notes.includes("adverb");
  const isNoun = notes.includes("en ") || notes.includes("ett ");

  let examples = "";

  if (isVerb) {
    const stem = word.replace(/a$/, "");
    examples = `Jag måste ${word} detta.\n(I must ${english} this.)\n\nHon ${stem}ar varje dag.\n(She ${english}s every day.)`;
  } else if (isAdjective) {
    examples = `Det är ${word}.\n(It is ${english}.)\n\nEn ${word} lösning.\n(A ${english} solution.)`;
  } else if (isAdverb) {
    examples = `Han kommer ${word}.\n(He is coming ${english}.)\n\nDet är ${word} sant.\n(It is ${english} true.)`;
  } else if (isNoun) {
    const article = notes.includes("ett ") ? "ett" : "en";
    examples = `Jag har ${article} ${word}.\n(I have a ${english}.)\n\nDet är min ${word}.\n(It is my ${english}.)`;
  } else {
    examples = `${word.charAt(0).toUpperCase() + word.slice(1)}.\n(${english.charAt(0).toUpperCase() + english.slice(1)}.)\n\nDet handlar om ${word}.\n(It's about ${english}.)`;
  }

  return examples;
}

async function addWords(words: WordToAdd[]) {
  const swedishCore: VocabWord[] = await Bun.file(
    "vocab/swedish-core.json",
  ).json();

  const existingWords = new Set(
    swedishCore.map((item) => item.word.toLowerCase()),
  );

  const newVocabEntries: VocabWord[] = [];

  for (const wordData of words) {
    if (existingWords.has(wordData.word.toLowerCase())) {
      console.log(`⏭️  Skipping "${wordData.word}" - already exists`);
      continue;
    }

    const examples =
      wordData.examples ||
      generateExamples(wordData.word, wordData.english, wordData.notes || "");

    const audio = examples.replace(/\n\([^)]+\)/g, "").replace(/\n/g, " ");

    newVocabEntries.push({
      word: wordData.word,
      english: wordData.english,
      examples: examples,
      audio: audio,
      tags: ["swedish"],
      notes: wordData.notes || "",
    });

    console.log(`✅ Added: ${wordData.word} - ${wordData.english}`);
  }

  if (newVocabEntries.length === 0) {
    console.log("\n⚠️  No new words to add");
    return;
  }

  // Add to existing vocabulary
  const updatedVocab = [...swedishCore, ...newVocabEntries];

  // Save the updated vocabulary
  await Bun.write(
    "vocab/swedish-core.json",
    JSON.stringify(updatedVocab, null, 2),
  );

  console.log(`\n📊 Summary:`);
  console.log(`  • Added ${newVocabEntries.length} new words`);
  console.log(`  • Total vocabulary: ${updatedVocab.length} words`);

  return newVocabEntries;
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
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Swedish Vocabulary Manager

Usage:
  bun vocab/add-swedish-words.ts --words "word1:translation1,word2:translation2"
  bun vocab/add-swedish-words.ts --kelly <count>    # Add from Kelly list
  bun vocab/add-swedish-words.ts --common           # Add common words
  bun vocab/add-swedish-words.ts --sync-only        # Just sync existing words

Options:
  --words    Comma-separated list of word:translation pairs
  --kelly    Number of words to add from Kelly list
  --common   Add predefined common words
  --sync-only Just run sync without adding words
  --no-images Skip image generation
  --help     Show this help message

Examples:
  bun vocab/add-swedish-words.ts --words "hej:hello,tack:thanks"
  bun vocab/add-swedish-words.ts --kelly 20
  bun vocab/add-swedish-words.ts --common --no-images
`);
    return;
  }

  let wordsToAdd: WordToAdd[] = [];

  if (args.includes("--sync-only")) {
    await syncToMochi();
    if (!args.includes("--no-images")) {
      await generateImages();
      await syncToMochi(); // Sync again to add images
    }
    return;
  }

  if (args.includes("--common")) {
    wordsToAdd = COMMON_WORDS;
  }

  const wordsIndex = args.indexOf("--words");
  if (wordsIndex !== -1 && args[wordsIndex + 1]) {
    const wordPairs = args[wordsIndex + 1].split(",");
    wordsToAdd = wordPairs.map((pair) => {
      const [word, english] = pair.split(":");
      return {
        word: word.trim(),
        english: english?.trim() || "[needs translation]",
      };
    });
  }

  if (wordsToAdd.length > 0) {
    console.log(`📝 Adding ${wordsToAdd.length} Swedish words...\n`);
    const added = await addWords(wordsToAdd);

    if (added && added.length > 0) {
      await syncToMochi();

      if (!args.includes("--no-images")) {
        await generateImages();
        await syncToMochi(); // Sync again to add images
      }
    }
  } else {
    console.log("No words specified. Use --words, --kelly, or --common");
    console.log("Run with --help for usage information");
  }
}

await main();
