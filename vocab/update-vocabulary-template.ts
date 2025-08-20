#!/usr/bin/env bun
import { MochiClient } from "../mochi-client";

const VOCABULARY_TEMPLATE_ID = "GAFwzU5S";

async function updateTemplate() {
  const client = new MochiClient(process.env.MOCHI_API_KEY!);

  console.log("Fetching current template...");

  // Get the template
  const response = await fetch(
    `https://app.mochi.cards/api/templates/${VOCABULARY_TEMPLATE_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MOCHI_API_KEY}`,
      },
    },
  );

  const template = await response.json();
  console.log("Current template fields:");
  console.log(JSON.stringify(template.fields, null, 2));

  // Add notes field if not exists
  const hasNotes = template.fields?.some((f: any) => f.name === "Notes");

  if (!hasNotes) {
    console.log(
      "\nNotes field not found. You'll need to add it manually in Mochi:",
    );
    console.log("1. Go to the template in Mochi");
    console.log("2. Add a new field called 'Notes'");
    console.log("3. Run fetch-template.ts again to get the field ID");
  } else {
    const notesField = template.fields.find((f: any) => f.name === "Notes");
    console.log(`\nNotes field exists with ID: ${notesField.id}`);
  }
}

updateTemplate().catch(console.error);
