#!/usr/bin/env bun
import { z } from "zod";

// Load API key from environment
const API_KEY = process.env.MOCHI_API_KEY;
if (!API_KEY) {
  console.error("❌ MOCHI_API_KEY not found in environment variables");
  console.error("Please set it in .env.local or export it");
  process.exit(1);
}

const BASE_URL = "https://app.mochi.cards/api";

// Schemas for validation
const DeckSchema = z.object({
  id: z.string(),
  name: z.string(),
  "parent-id": z.string().nullable().optional(),
  archived: z.boolean().optional(),
  "sort-by": z.enum(["created-at", "updated-at", "due-at"]).optional(),
  "cards-per-day": z.number().optional(),
  "review-reverse": z.boolean().optional(),
});

const CardSchema = z.object({
  id: z.string(),
  content: z.string(),
  "deck-id": z.string(),
  "template-id": z.string().optional(),
  archived: z.boolean().optional(),
  "review-reverse": z.boolean().optional(),
  "created-at": z.string().optional(),
  "updated-at": z.string().optional(),
  fields: z
    .record(
      z.object({
        id: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  fields: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        "is-primary": z.boolean().optional(),
      }),
    )
    .optional(),
});

type Deck = z.infer<typeof DeckSchema>;
type Card = z.infer<typeof CardSchema>;
type Template = z.infer<typeof TemplateSchema>;

class MochiClient {
  private headers: HeadersInit;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mochi API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // Deck methods
  async listDecks(): Promise<Deck[]> {
    const response = await this.request<{ docs: Deck[] }>("/decks");
    return response.docs;
  }

  async getDeck(deckId: string): Promise<Deck> {
    return this.request<Deck>(`/decks/${deckId}`);
  }

  async createDeck(data: {
    name: string;
    "parent-id"?: string;
    "cards-per-day"?: number;
  }): Promise<Deck> {
    return this.request<Deck>("/decks/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Card methods
  async listCards(deckId?: string, limit = 10): Promise<Card[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(deckId && { "deck-id": deckId }),
    });
    const response = await this.request<{ docs: Card[] }>(`/cards?${params}`);
    return response.docs;
  }

  async getCard(cardId: string): Promise<Card> {
    return this.request<Card>(`/cards/${cardId}`);
  }

  /**
   * Creates or updates a card. If `id` is provided, updates the existing card.
   * Otherwise, creates a new card.
   *
   * @param data - Card data including optional `id` for updates
   * @returns The created or updated card
   */
  async createCard(data: {
    id?: string; // If provided, updates existing card instead of creating new
    content: string;
    "deck-id": string;
    "template-id"?: string;
    fields?: Record<string, { id: string; value: string }>;
    tags?: string[];
  }): Promise<Card> {
    // Convert tags array to Set for the API
    const payload: any = {
      content: data.content,
      "deck-id": data["deck-id"],
    };

    if (data["template-id"]) {
      payload["template-id"] = data["template-id"];
    }

    if (data.fields) {
      payload.fields = data.fields;
    }

    if (data.tags && data.tags.length > 0) {
      // API expects tags as an array in 'manual-tags' field
      payload["manual-tags"] = data.tags;
    }

    // If ID provided, update existing card; otherwise create new
    const endpoint = data.id ? `/cards/${data.id}` : "/cards/";

    return this.request<Card>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateCard(
    cardId: string,
    data: Partial<{
      content: string;
      "deck-id": string;
      "template-id"?: string;
      fields?: Record<string, { id: string; value: string }>;
      archived: boolean;
      tags: string[];
    }>,
  ): Promise<Card> {
    const payload: any = { ...data };

    if (data.tags) {
      payload["manual-tags"] = data.tags;
      delete payload.tags;
    }

    return this.request<Card>(`/cards/${cardId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request(`/cards/${cardId}`, {
      method: "DELETE",
    });
  }

  // Template methods
  async listTemplates(): Promise<Template[]> {
    const response = await this.request<{ docs: Template[] }>("/templates");
    return response.docs;
  }

  async getTemplate(templateId: string): Promise<Template> {
    return this.request<Template>(`/templates/${templateId}`);
  }
}

// CLI Interface
async function main() {
  const client = new MochiClient(API_KEY);
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "decks":
      case "list-decks": {
        const decks = await client.listDecks();
        console.log("\n📚 Your Mochi Decks:");
        decks.forEach((deck) => {
          const indent = deck["parent-id"] ? "  └─ " : "├─ ";
          console.log(`${indent}${deck.name} (${deck.id})`);
        });
        break;
      }

      case "create-deck": {
        const name = args[1];
        if (!name) {
          console.error('Usage: bun mochi-client.ts create-deck "Deck Name"');
          process.exit(1);
        }
        const deck = await client.createDeck({ name });
        console.log(`✅ Created deck: ${deck.name} (${deck.id})`);
        break;
      }

      case "cards":
      case "list-cards": {
        const deckId = args[1];
        const cards = await client.listCards(deckId, 20);
        console.log("\n📝 Recent Cards:");
        cards.forEach((card) => {
          const preview = card.content.split("\n")[0].slice(0, 60);
          console.log(`├─ ${card.id}: ${preview}...`);
        });
        break;
      }

      case "create":
      case "create-card": {
        const deckId = args[1];
        const content = args[2];
        const tags = args[3]?.split(",").map((t) => t.trim());

        if (!deckId || !content) {
          console.error(
            'Usage: bun mochi-client.ts create-card <deck-id> "content" [tags,separated,by,comma]',
          );
          console.error("\nExample:");
          console.error(
            '  bun mochi-client.ts create-card abc123 "What is TypeScript?" "programming,typescript"',
          );
          process.exit(1);
        }

        const card = await client.createCard({
          content,
          "deck-id": deckId,
          tags,
        });
        console.log(`✅ Created card in deck ${deckId}`);
        console.log(`   ID: ${card.id}`);
        break;
      }

      case "create-qa":
      case "qa": {
        const deckId = args[1];
        const question = args[2];
        const answer = args[3];
        const tags = args[4]?.split(",").map((t) => t.trim());

        if (!deckId || !question || !answer) {
          console.error(
            'Usage: bun mochi-client.ts create-qa <deck-id> "question" "answer" [tags]',
          );
          console.error("\nExample:");
          console.error(
            '  bun mochi-client.ts create-qa abc123 "What is Bun?" "A fast JavaScript runtime" "javascript,bun"',
          );
          process.exit(1);
        }

        const content = `# ${question}\n\n---\n\n${answer}`;
        const card = await client.createCard({
          content,
          "deck-id": deckId,
          tags,
        });
        console.log(`✅ Created Q&A card in deck ${deckId}`);
        console.log(`   Question: ${question}`);
        console.log(`   ID: ${card.id}`);
        break;
      }

      case "bulk-create": {
        const deckId = args[1];
        const filePath = args[2];

        if (!deckId || !filePath) {
          console.error(
            "Usage: bun mochi-client.ts bulk-create <deck-id> <json-file>",
          );
          console.error("\nJSON file format:");
          console.error("[");
          console.error(
            '  { "content": "Card 1 content", "tags": ["tag1", "tag2"] },',
          );
          console.error(
            '  { "question": "Question?", "answer": "Answer", "tags": ["tag3"] }',
          );
          console.error("]");
          process.exit(1);
        }

        const file = Bun.file(filePath);
        const data = await file.json();

        if (!Array.isArray(data)) {
          console.error("JSON file must contain an array of cards");
          process.exit(1);
        }

        console.log(`📦 Creating ${data.length} cards...`);
        let created = 0;

        for (const item of data) {
          try {
            if ("question" in item && "answer" in item) {
              const content = `# ${item.question}\n\n---\n\n${item.answer}`;
              await client.createCard({
                content,
                "deck-id": deckId,
                tags: item.tags,
              });
            } else if ("content" in item) {
              await client.createCard({
                content: item.content,
                "deck-id": deckId,
                tags: item.tags,
              });
            }
            created++;
            process.stdout.write(
              `\r✅ Created ${created}/${data.length} cards`,
            );
          } catch (error) {
            console.error(`\n❌ Failed to create card: ${error}`);
          }
        }
        console.log("\n✨ Bulk creation complete!");
        break;
      }

      case "templates":
      case "list-templates": {
        const templates = await client.listTemplates();
        console.log("\n📋 Available Templates:");
        templates.forEach((template) => {
          console.log(`├─ ${template.name} (${template.id})`);
          if (Array.isArray(template.fields)) {
            template.fields.forEach((field) => {
              console.log(`   └─ ${field.name} (${field.id})`);
            });
          }
        });
        break;
      }

      case "help":
      default: {
        console.log(`
🍡 Mochi Cards CLI

Commands:
  list-decks                    List all your decks
  create-deck "Name"            Create a new deck
  
  list-cards [deck-id]          List cards (optionally filter by deck)
  create-card <deck-id> "content" [tags]
                               Create a simple card
  create-qa <deck-id> "Q" "A" [tags]  
                               Create a Q&A card
  
  bulk-create <deck-id> <file.json>
                               Create multiple cards from JSON
  
  list-templates               List available templates

Examples:
  bun mochi-client.ts list-decks
  bun mochi-client.ts create-deck "JavaScript Study"
  bun mochi-client.ts create-card abc123 "What is closure?"
  bun mochi-client.ts create-qa abc123 "What is Bun?" "A fast JS runtime" "javascript,tools"
  bun mochi-client.ts bulk-create abc123 cards.json
        `);
        break;
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.main) {
  main();
}

// Export for use as module
export { MochiClient, type Card, type Deck, type Template };
