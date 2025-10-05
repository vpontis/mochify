#!/usr/bin/env bun

/**
 * Clean up verbose notes in recent vocabulary entries
 * - Remove [object Object] errors
 * - Shorten overly long notes to just essential grammar
 */

import OpenAI from "openai";

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function cleanupNote({
  word,
  english,
  notes,
}: {
  word: string;
  english: string;
  notes: string;
}): Promise<string> {
  // If notes don't contain [object Object] and are short, keep them
  if (!notes.includes("[object Object]") && notes.length < 100) {
    return notes;
  }

  try {
    const prompt = `For the Swedish word "${word}" (${english}), create a SHORT grammar note (max 1-2 sentences).

Current verbose note: "${notes}"

Return ONLY the essential grammar information such as:
- Verb conjugations (present/past/supine)
- Noun gender and plural forms
- Irregular forms
- Key usage notes

Be concise! Examples of good notes:
- "vill/ville/velat (modal verb)"
- "en bok, boken, böcker (common gender)"
- "är/var/varit (irregular verb)"
- "ett barn, barnet, barn (neuter, same plural)"

Return just the cleaned note text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Swedish language expert. Create concise grammar notes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const cleanedNote = response.choices[0].message.content?.trim() || notes;

    // Remove quotes if AI wrapped the response
    return cleanedNote.replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error(`❌ Failed to clean note for "${word}":`, error);
    // Fallback: just remove [object Object] and trim
    return notes.replace(/\[object Object\];?\s*/g, "").trim();
  }
}

async function main() {
  const vocabData: VocabWord[] = await Bun.file(
    "vocab/swedish-core.json",
  ).json();

  console.log(`📚 Total vocabulary entries: ${vocabData.length}`);

  // Process last 50 entries
  const startIndex = Math.max(0, vocabData.length - 50);
  const entriesToClean = vocabData.slice(startIndex);

  console.log(
    `🧹 Cleaning notes for entries ${startIndex + 1}-${vocabData.length}...\n`,
  );

  let cleaned = 0;
  let skipped = 0;

  for (const entry of entriesToClean) {
    const needsCleaning =
      entry.notes.includes("[object Object]") || entry.notes.length > 150;

    if (!needsCleaning) {
      console.log(`⏭️  [${entry.word}] skipping - note is fine`);
      skipped++;
      continue;
    }

    process.stdout.write(`🧹 [${entry.word}] cleaning...`);

    const oldNote = entry.notes;
    const newNote = await cleanupNote({
      word: entry.word,
      english: entry.english,
      notes: entry.notes,
    });

    entry.notes = newNote;
    cleaned++;

    console.log(` ✅`);
    console.log(
      `   Old (${oldNote.length} chars): ${oldNote.substring(0, 80)}...`,
    );
    console.log(`   New (${newNote.length} chars): ${newNote}`);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Save updated vocabulary
  await Bun.write(
    "vocab/swedish-core.json",
    JSON.stringify(vocabData, null, 2),
  );

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Cleaned: ${cleaned} notes`);
  console.log(`  ⏭️  Skipped: ${skipped} notes`);
  console.log(`\n💾 Saved to vocab/swedish-core.json`);
}

await main();
