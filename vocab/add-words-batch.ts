#!/usr/bin/env bun

import { parse } from "csv-parse/sync";

interface VocabWord {
  word: string;
  english: string;
  examples: string;
  audio: string;
  tags: string[];
  notes: string;
  mochiId?: string;
}

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

const skipWords = new Set([
  "ha",
  "dess",
  "å",
  "kunna",
  "skola",
  "få",
  "bli",
  "komma",
  "vilja",
  "göra",
  "finna",
  "se",
  "gå",
  "säga",
  "år",
  "äga",
  "betyda",
  "böra",
  "ge",
  "riva",
  "börja",
  "dag",
  "land",
  "fråga",
  "tro",
  "veta",
  "försöka",
  "behöva",
  "känna",
  "läsa",
  "låta",
  "stå",
  "visa",
  "använda",
  "vända",
  "hålla",
  "tänka",
  "barn",
  "liv",
  "värld",
  "folk",
  "regering",
  "söka",
  "sak",
  "person",
  "ligga",
  "son",
  "lägga",
  "antal",
  "kvinna",
  "problem",
  "fall",
  "man",
  "anse",
  "öva",
  "lag",
  "slag",
  "tal",
  "handla",
  "gammal",
  "bild",
  "sida",
  "öka",
  "god",
  "skapa",
  "arbete",
  "kapa",
  "blogg",
  "gälla",
  "verka",
  "tala",
  "bära",
  "väg",
  "samhälle",
  "stat",
  "stad",
  "höra",
  "företag",
  "möjlighet",
  "ord",
  "välja",
  "förstå",
  "inlägg",
  "ägg",
  "te",
  "spela",
  "hitta",
  "tag",
  "dra",
  "leda",
  "förslag",
  "område",
  "lag",
  "lära",
  "sätta",
  "plats",
  "lämna",
  "bygga",
  "politik",
  "kalla",
  "peng",
  "leva",
  "ställa",
  "följa",
  "vecka",
  "ske",
  "parti",
  "kräva",
  "utveckling",
  "ena",
  "svara",
  "fortsätta",
  "skola",
  "bruka",
  "mål",
  "par",
  "namn",
  "mena",
  "grupp",
  "beslut",
  "slå",
  "miljon",
  "svar",
  "först",
  "arbeta",
  "hand",
  "beta",
  "köpa",
  "sitta",
  "krig",
  "val",
  "kyrka",
  "historia",
  "jobb",
  "berätta",
  "rätta",
  "information",
  "film",
  "slut",
  "massa",
  "tanke",
  "akt",
  "procent",
  "månad",
  "sluta",
  "verksamhet",
  "rätt",
  "familj",
  "åka",
  "betala",
  "kommun",
  "resultat",
  "utveckla",
  "föra",
  "hjälpa",
  "text",
  "exempel",
  "debatt",
  "situation",
  "form",
  "orm",
  "råd",
  "makt",
  "system",
  "vänta",
  "åtgärd",
  "krav",
  "skillnad",
  "riksdag",
  "jobba",
  "klara",
  "typ",
  "tur",
  "polis",
  "medium",
  "mun",
  "ansvar",
  "roll",
  "regel",
  "prata",
  "organisation",
  "medlem",
]);

function generateExampleSentences(
  word: string,
  english: string,
  pos: string,
): string {
  const examples: { [key: string]: { [word: string]: string } } = {
    verb: {
      acceptera:
        "Jag kan inte acceptera detta.\n(I cannot accept this.)\n\nHon accepterade erbjudandet.\n(She accepted the offer.)",
      diskutera:
        "Vi behöver diskutera problemet.\n(We need to discuss the problem.)\n\nDe diskuterade länge.\n(They discussed for a long time.)",
    },
    adjective: {
      internationell:
        "Det är en internationell fråga.\n(It's an international issue.)\n\nHan har internationell erfarenhet.\n(He has international experience.)",
      europeisk:
        "Den europeiska unionen.\n(The European Union.)\n\nEuropeisk kultur är varierad.\n(European culture is varied.)",
    },
    adverb: {
      förmodligen:
        "Han kommer förmodligen imorgon.\n(He's probably coming tomorrow.)\n\nDet är förmodligen sant.\n(It's probably true.)",
      naturligtvis:
        "Naturligtvis hjälper jag dig.\n(Of course I'll help you.)\n\nDet är naturligtvis viktigt.\n(It's naturally important.)",
    },
    noun: {
      kraft:
        "Hon har stor kraft.\n(She has great strength.)\n\nKraftens betydelse.\n(The importance of power.)",
      fördel:
        "Det finns många fördelar.\n(There are many advantages.)\n\nEn stor fördel med detta.\n(A big advantage with this.)",
    },
  };

  const defaultExamples = `${word.charAt(0).toUpperCase() + word.slice(1)}.\n(${english.charAt(0).toUpperCase() + english.slice(1)}.)\n\n${word} är viktigt.\n(${english} is important.)`;

  const categoryExamples = examples[pos.replace("noun-", "")] || {};
  return categoryExamples[word] || defaultExamples;
}

function generateNotes(word: string, pos: string): string {
  const posMap: { [key: string]: string } = {
    verb: "verb",
    adjective: "adjective",
    adverb: "adverb",
    "noun-en": "en-word",
    "noun-ett": "ett-word",
    pronoun: "pronoun",
    prep: "preposition",
    conj: "conjunction",
    det: "determiner",
    interj: "interjection",
    particle: "particle",
    subj: "subjunction",
  };

  return posMap[pos] || pos.replace("noun-", "");
}

async function addWordsFromKelly({
  count = 30,
  startFrom = 0,
}: {
  count?: number;
  startFrom?: number;
}) {
  const newWords: Array<{ word: string; pos: string; rank: number }> = [];

  for (const row of kellyWords) {
    const word = row["Lemma"]?.toLowerCase().trim();
    const pos = row["POS"];
    const rank = parseInt(row["ID"]) || 0;

    if (!word || existingWords.has(word) || skipWords.has(word)) continue;
    if (word.includes("(") || word.includes(".") || word.includes(","))
      continue;
    if (["proper name", "numeral"].includes(pos)) continue;
    if (rank < 200) continue;

    newWords.push({ word, pos, rank });
  }

  newWords.sort((a, b) => a.rank - b.rank);

  const selected = newWords.slice(startFrom, startFrom + count);

  console.log(
    `📝 Adding ${selected.length} new Swedish words (${startFrom + 1}-${startFrom + selected.length})\n`,
  );

  const newVocabEntries: VocabWord[] = selected.map((item) => {
    const english = ""; // This would need to be filled in manually or via translation API
    const examples = generateExampleSentences(
      item.word,
      english || item.word,
      item.pos,
    );
    const audio = examples.replace(/\n\([^)]+\)/g, "").replace(/\n/g, " ");
    const notes = generateNotes(item.word, item.pos);

    return {
      word: item.word,
      english: english || `[needs translation]`,
      examples: examples,
      audio: audio,
      tags: ["swedish"],
      notes: notes,
    };
  });

  // Add to existing vocabulary
  const updatedVocab = [...swedishCore, ...newVocabEntries];

  // Save the updated vocabulary
  await Bun.write(
    "vocab/swedish-core.json",
    JSON.stringify(updatedVocab, null, 2),
  );

  console.log(`✅ Added ${newVocabEntries.length} words to swedish-core.json`);
  console.log(`📊 Total vocabulary: ${updatedVocab.length} words\n`);

  // Show the words that need translation
  console.log("⚠️  Words needing English translations:");
  newVocabEntries.forEach((entry, i) => {
    console.log(`${startFrom + i + 1}. ${entry.word} - ${entry.notes}`);
  });

  console.log("\n📌 Next steps:");
  console.log("1. Add English translations to the new words");
  console.log("2. Run: bun vocab/sync-swedish-vocabulary.ts");
  console.log("3. Run: OPENAI_API_KEY=$OPENAI_API_KEY bun vocab/gen-images.ts");
  console.log("4. Run sync again to add images to cards");
}

// Parse command line arguments
const count = parseInt(process.argv[2]) || 30;
const startFrom = parseInt(process.argv[3]) || 0;

await addWordsFromKelly({ count, startFrom });
