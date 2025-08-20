#!/usr/bin/env bun

const BATCH_SIZE = 10; // Process 10 words at a time

// Common verb forms and notes
const verbNotes: Record<string, string> = {
  "att vara": "är/var/varit (irregular)",
  "att ha": "har/hade/haft",
  "att kunna": "kan/kunde/kunnat (modal verb, no -r in present)",
  "att få": "får/fick/fått (irregular)",
  "att bli": "blir/blev/blivit (irregular)",
  "att komma": "kommer/kom/kommit (irregular)",
  "att vilja": "vill/ville/velat (modal verb, no -r in present)",
  "att göra": "gör/gjorde/gjort (irregular)",
  "att finna": "finner/fann/funnit (formal, 'hitta' more common)",
  "att ta": "tar/tog/tagit (irregular)",
  "att se": "ser/såg/sett (irregular)",
  "att gå": "går/gick/gått (irregular)",
  "att säga": "säger/sa(de)/sagt (irregular)",
  "att ge": "ger/gav/gett (irregular)",
  "att veta": "vet/visste/vetat (irregular)",
  "att tycka": "tycker/tyckte/tyckt ('tycker om' = to like)",
  "att sätta": "sätter/satte/satt",
  "att ligga": "ligger/låg/legat (irregular)",
  "att känna": "känner/kände/känt",
  "att behöva": "behöver/behövde/behövt",
  "att finnas": "finns/fanns/funnits (only exists in -s form)",
  "att heta": "heter/hette/hetat",
  "att tro": "tror/trodde/trott",
  "att stå": "står/stod/stått (irregular)",
  "att leva": "lever/levde/levt",
  "att börja": "börjar/började/börjat",
  "att sitta": "sitter/satt/suttit (irregular)",
  "att arbeta": "arbetar/arbetade/arbetat",
  "att hjälpa": "hjälper/hjälpte/hjälpt",
  "att lära": "lär/lärde/lärt ('lära sig' = to learn)",
  "att tala": "talar/talade/talat",
  "att läsa": "läser/läste/läst",
  "att skriva": "skriver/skrev/skrivit (irregular)",
  "att äta": "äter/åt/ätit (irregular)",
  "att dricka": "dricker/drack/druckit (irregular)",
  "att sova": "sover/sov/sovit (irregular)",
  "att köpa": "köper/köpte/köpt",
  "att sälja": "säljer/sålde/sålt (irregular)",
  "att betala": "betalar/betalade/betalat",
  "att öppna": "öppnar/öppnade/öppnat",
  "att stänga": "stänger/stängde/stängt",
  "att fråga": "frågar/frågade/frågat",
  "att svara": "svarar/svarade/svarat",
  "att vänta": "väntar/väntade/väntat",
  "att titta": "tittar/tittade/tittat",
  "att lyssna": "lyssnar/lyssnade/lyssnat",
  "att prata": "pratar/pratade/pratat",
  "att förstå": "förstår/förstod/förstått (irregular)",
  "att glömma": "glömmer/glömde/glömt",
  "att minnas": "minns/mindes/mints (deponent verb)",
  "att tänka": "tänker/tänkte/tänkt",
  "att försöka": "försöker/försökte/försökt",
  "att sluta": "slutar/slutade/slutat",
  "att spela": "spelar/spelade/spelat",
  "att sjunga": "sjunger/sjöng/sjungit (irregular)",
  "att dansa": "dansar/dansade/dansat",
  "att resa": "reser/reste/rest",
  "att åka": "åker/åkte/åkt",
  "att flyga": "flyger/flög/flugit (irregular)",
  "att köra": "kör/körde/kört",
  "att cykla": "cyklar/cyklade/cyklat",
  "att springa": "springer/sprang/sprungit (irregular)",
  "att simma": "simmar/simmade/simmat",
  "att träna": "tränar/tränade/tränat",
  "att vila": "vilar/vilade/vilat",
  "att vakna": "vaknar/vaknade/vaknat",
};

// Adjective notes
const adjectiveNotes: Record<string, string> = {
  liten: "liten/litet/lilla/små (irregular plural)",
  stor: "stor/stort/stora",
  ny: "ny/nytt/nya",
  bra: "Invariable - always 'bra'",
  första: "Ordinal number - invariable",
  rätt: "Can mean 'right/correct' or 'quite'",
  redan: "Adverb - 'already'",
};

// Special words and their notes
const specialNotes: Record<string, string> = {
  och: "Most common conjunction",
  i: "Also means 'for' in time expressions (i tre år)",
  det: "Neuter pronoun; also dummy subject",
  en: "Indefinite article for common gender",
  ett: "Indefinite article for neuter gender",
  som: "Relative pronoun; no genitive form",
  på: "Many idiomatic uses (på svenska, på måndag)",
  av: "Often indicates possession or origin",
  för: "Also means 'too' (för mycket)",
  att: "Infinitive marker; also conjunction 'that'",
  "ska/skall": "Modal verb for future; 'skall' is formal",
  jag: "Capital only at sentence start",
  inte: "Placed after verb in main clause",
  med: "Many phrasal verbs (ta med, hålla med)",
  till: "Direction; many phrasal verbs",
  den: "Common gender 'it/the'",
  om: "Also means 'if' and 'in' (time)",
  vi: "We/us - same form",
  men: "But/however",
  man: "Generic 'one/you'; Plural: män (men)",
  "de/dom": "'dom' in spoken Swedish for both de/dem",
  så: "Intensifier; also 'so/thus'",
  sig: "Reflexive for 3rd person (han/hon/de/det)",
  han: "He/him - same form",
  "sin/sitt/sina": "Reflexive possessive (3rd person)",
  eller: "Or; 'eller hur?' = right?",
  från: "From; origin or starting point",
  mycket: "Much/very - both adjective and adverb",
  "all/allt/alla": "all/everything/everyone",
  "annan/annat/andra": "'andra' also means 'second'",
  du: "Informal 'you'; 'ni' for formal/plural",
  "någon/något/några": "Someone/something/some",
  när: "When (question and conjunction)",
  måste: "Modal verb - no infinitive form",
  detta: "Neuter 'this'; formal style",
  nu: "Now; often softens commands",
  vad: "What; also in exclamations",
  "ett år": "Plural: år (no change)",
  under: "Under/during/below",
  också: "Also/too - stressed on first syllable",
  efter: "After; many phrasal verbs",
  hon: "She/her - same form",
  två: "Two; 'tvåan' = bus/tram line 2",
  var: "Where; also past of 'vara'",
  över: "Over/above; many idiomatic uses",
  "mer/mera": "'mera' is formal/old-fashioned",
  bara: "Only/just; softens statements",
  här: "Here; 'härifrån' = from here",
  då: "Then; also 'when' in past",
  sedan: "Then/since; 'sen' in spoken",
  tre: "Three; 'trean' = bus/tram line 3",
  själv: "Self; 'själva' = even/actually",
  genom: "Through; 'genom att' = by (doing)",
  dag: "Day; Plural: dagar; 'i dag' = today",
  där: "There; 'där borta' = over there",
  hur: "How; 'hur som helst' = anyway",
  utan: "Without; strong contrast to 'med'",
  "vilken/vilket/vilka": "Which/what; exclamations too",
  tid: "Time; 'i tid' = on time",
  kanske: "Maybe - verb stays in present",
  vem: "Who/whom - same form",
  fyra: "Four; 'fyran' = bus/tram line 4",
  aldrig: "Never; stronger than 'inte'",
  igen: "Again; also 'closed' (stängt igen)",
};

async function addNotesToVocabulary() {
  const file = Bun.file("./swedish-core.json");
  let vocabulary = await file.json();

  console.log(`Adding notes to ${vocabulary.length} words...`);

  // Process in batches
  for (let i = 0; i < vocabulary.length; i += BATCH_SIZE) {
    const batch = vocabulary.slice(
      i,
      Math.min(i + BATCH_SIZE, vocabulary.length),
    );
    console.log(
      `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (words ${i + 1}-${Math.min(i + BATCH_SIZE, vocabulary.length)}):`,
    );

    for (const item of batch) {
      const word = item.word;

      // Determine notes based on word type
      let notes = "";

      if (word.startsWith("att ")) {
        // It's a verb
        notes = verbNotes[word] || "Regular verb";
      } else if (adjectiveNotes[word]) {
        notes = adjectiveNotes[word];
      } else if (specialNotes[word]) {
        notes = specialNotes[word];
      } else {
        // Try to determine if it's a noun
        if (word.startsWith("en ") || word.startsWith("ett ")) {
          const article = word.startsWith("en ") ? "en" : "ett";
          const noun = word.substring(word.indexOf(" ") + 1);
          if (article === "en") {
            notes = `Common gender; Definite: -en`;
          } else {
            notes = `Neuter gender; Definite: -et`;
          }
        } else {
          // Default notes for other words
          notes = "";
        }
      }

      item.notes = notes;
      console.log(`  ✓ ${word}: ${notes || "(no special notes)"}`);
    }

    // Save after each batch
    await Bun.write(
      "./swedish-core.json",
      JSON.stringify(vocabulary, null, 2),
    );
    console.log(`  💾 Saved batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  console.log("\n✅ All notes added successfully!");
}

addNotesToVocabulary().catch(console.error);
