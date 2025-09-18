#!/usr/bin/env bun

import { parse } from "csv-parse/sync";

const kellyCSV = await Bun.file("vocab/kelly-swedish.csv").text();
const swedishCore = await Bun.file("vocab/swedish-core.json").json();

const kellyWords = parse(kellyCSV, {
  columns: true,
  skip_empty_lines: true,
});

const existingWords = new Set(
  swedishCore
    .map((item: any) => {
      const word = item.word.toLowerCase();
      const variants = word.split("/").map((w: string) => w.trim());
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

const newWords: Array<{ word: string; pos: string; rank: number }> = [];

for (const row of kellyWords) {
  const word = row["Lemma"]?.toLowerCase().trim();
  const pos = row["POS"];
  const rank = parseInt(row["ID"]) || 0;

  if (!word || existingWords.has(word) || skipWords.has(word)) continue;

  if (word.includes("(") || word.includes(".") || word.includes(",")) continue;

  if (["proper name", "numeral"].includes(pos)) continue;

  if (rank < 200) continue;

  newWords.push({ word, pos, rank });
}

newWords.sort((a, b) => a.rank - b.rank);

const count = parseInt(process.argv[2]) || 50;
const startFrom = parseInt(process.argv[3]) || 0;
const selected = newWords.slice(startFrom, startFrom + count);

console.log(`Found ${newWords.length} new words.\n`);
console.log(`Showing words ${startFrom + 1}-${startFrom + count}:\n`);

selected.forEach((item, i) => {
  const posLabel = item.pos.replace("noun-", "").replace("aux ", "");
  console.log(`${startFrom + i + 1}. ${item.word} - (${posLabel})`);
});

console.log("\nTo add these words, review the list above and confirm.");
console.log(`\nUsage: bun vocab/find-new-words.ts [count] [start_from]`);
console.log(`Example: bun vocab/find-new-words.ts 50 0   # First 50 words`);
console.log(`         bun vocab/find-new-words.ts 50 50  # Next 50 words`);
