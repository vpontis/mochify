#!/usr/bin/env bun
import { z } from "zod";
import { Command } from "commander";
import { FetchJSON } from "./fetch-json";

// Load API key from environment
const API_KEY = process.env.MOCHI_API_KEY;

const BASE_URL = "https://app.mochi.cards/api";

// Schemas for validation
// Using Zod 4's improved syntax
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
  "template-id": z.string().nullable().optional(),
  archived: z.boolean().optional(),
  "review-reverse": z.boolean().optional(),
  // API returns these as objects with date info, not strings
  "created-at": z.union([z.string(), z.object({})]).optional(),
  "updated-at": z.union([z.string(), z.object({})]).optional(),
  fields: z
    .record(
      z.string(),
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
    .union([
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          "is-primary": z.boolean().optional(),
        }),
      ),
      z.record(
        z.string(),
        z.object({
          id: z.string(),
          name: z.string(),
          "is-primary": z.boolean().optional(),
        }),
      ),
    ])
    .optional(),
});

// Zod 4 supports better type inference
type Deck = z.infer<typeof DeckSchema>;
type Card = z.infer<typeof CardSchema>;
type Template = z.infer<typeof TemplateSchema>;

class MochiClient {
  private headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
    };
  }

  // Deck methods
  async listDecks(): Promise<Deck[]> {
    const response = await FetchJSON.get(`${BASE_URL}/decks`, {
      headers: this.headers,
      schema: z.object({ docs: z.array(DeckSchema) }),
    });
    return response.docs;
  }

  async getDeck(deckId: string): Promise<Deck> {
    return FetchJSON.get(`${BASE_URL}/decks/${deckId}`, {
      headers: this.headers,
      schema: DeckSchema,
    });
  }

  async createDeck(data: {
    name: string;
    "parent-id"?: string;
    "cards-per-day"?: number;
  }): Promise<Deck> {
    return FetchJSON.post(`${BASE_URL}/decks/`, data, {
      headers: this.headers,
      schema: DeckSchema,
    });
  }

  // Card methods
  async listCards(deckId?: string, limit = 10): Promise<Card[]> {
    const response = await FetchJSON.get(`${BASE_URL}/cards`, {
      headers: this.headers,
      params: {
        limit: limit.toString(),
        ...(deckId && { "deck-id": deckId }),
      },
      schema: z.object({ docs: z.array(CardSchema) }),
    });
    return response.docs;
  }

  async getCard(cardId: string): Promise<Card> {
    return FetchJSON.get(`${BASE_URL}/cards/${cardId}`, {
      headers: this.headers,
      schema: CardSchema,
    });
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
    // Build payload
    const payload: any = {
      "deck-id": data["deck-id"],
    };

    // Always include content field (required by API)
    payload.content = data.content;

    // Add template-id if provided
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
    const endpoint = data.id
      ? `${BASE_URL}/cards/${data.id}`
      : `${BASE_URL}/cards/`;

    return FetchJSON.post(endpoint, payload, {
      headers: this.headers,
      schema: CardSchema,
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

    return FetchJSON.post(`${BASE_URL}/cards/${cardId}`, payload, {
      headers: this.headers,
      schema: CardSchema,
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await FetchJSON.del(`${BASE_URL}/cards/${cardId}`, {
      headers: this.headers,
    });
  }

  // Template methods
  async listTemplates(): Promise<Template[]> {
    const response = await FetchJSON.get(`${BASE_URL}/templates`, {
      headers: this.headers,
      schema: z.object({ docs: z.array(TemplateSchema) }),
    });
    return response.docs;
  }

  async getTemplate(templateId: string): Promise<Template> {
    return FetchJSON.get(`${BASE_URL}/templates/${templateId}`, {
      headers: this.headers,
      schema: TemplateSchema,
    });
  }
}

// CLI Interface using Commander
function createCLI() {
  if (!API_KEY) {
    console.error("❌ MOCHI_API_KEY not found in environment variables");
    console.error("Please set it in .env.local or export it");
    process.exit(1);
  }

  const client = new MochiClient(API_KEY);
  const program = new Command();

  program
    .name("mochi")
    .description(
      "🍡 Mochi Cards CLI - Create and manage flashcards programmatically",
    )
    .version("1.0.0");

  // Deck commands
  program
    .command("list-decks")
    .description("List all your decks")
    .action(async () => {
      try {
        const decks = await client.listDecks();
        console.log("\n📚 Your Mochi Decks:");
        decks.forEach((deck) => {
          const indent = deck["parent-id"] ? "  └─ " : "├─ ";
          console.log(`${indent}${deck.name} (${deck.id})`);
        });
      } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });

  program
    .command("create-deck <name>")
    .description("Create a new deck")
    .action(async (name: string) => {
      try {
        const deck = await client.createDeck({ name });
        console.log(`✅ Created deck: ${deck.name} (${deck.id})`);
      } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });

  // Card commands
  program
    .command("list-cards")
    .description("List recent cards")
    .option("-d, --deck <id>", "Filter by deck ID")
    .option("-l, --limit <number>", "Number of cards to show", "20")
    .action(async (options: { deck?: string; limit: string }) => {
      try {
        const cards = await client.listCards(
          options.deck,
          parseInt(options.limit),
        );
        console.log("\n📝 Recent Cards:");
        cards.forEach((card) => {
          const preview = card.content.split("\n")[0]?.slice(0, 60) || "";
          console.log(`├─ ${card.id}: ${preview}...`);
        });
      } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });

  program
    .command("get-card <card-id>")
    .description("Get details of a specific card")
    .action(async (cardId: string) => {
      const card = await client.getCard(cardId);
      console.log(JSON.stringify(card, null, 2));
    });

  program
    .command("create-card <deck-id> <content>")
    .description("Create a card with content")
    .option("-t, --tags <tags>", "Comma-separated tags")
    .action(
      async (deckId: string, content: string, options: { tags?: string }) => {
        try {
          const tags = options.tags?.split(",").map((t) => t.trim());
          const card = await client.createCard({
            content,
            "deck-id": deckId,
            tags,
          });
          console.log(`✅ Created card in deck ${deckId}`);
          console.log(`   ID: ${card.id}`);
        } catch (error) {
          console.error("❌ Error:", error);
          process.exit(1);
        }
      },
    );

  program
    .command("create-qa <deck-id> <question> <answer>")
    .description("Create a Q&A card")
    .option("-t, --tags <tags>", "Comma-separated tags")
    .action(
      async (
        deckId: string,
        question: string,
        answer: string,
        options: { tags?: string },
      ) => {
        try {
          const tags = options.tags?.split(",").map((t) => t.trim());
          const content = `# ${question}\n\n---\n\n${answer}`;
          const card = await client.createCard({
            content,
            "deck-id": deckId,
            tags,
          });
          console.log(`✅ Created Q&A card in deck ${deckId}`);
          console.log(`   Question: ${question}`);
          console.log(`   ID: ${card.id}`);
        } catch (error) {
          console.error("❌ Error:", error);
          process.exit(1);
        }
      },
    );

  program
    .command("bulk-create <deck-id> <file>")
    .description("Create cards from JSON file")
    .action(async (deckId: string, filePath: string) => {
      try {
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
      } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });

  // Template commands
  program
    .command("list-templates")
    .description("List available templates")
    .action(async () => {
      try {
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
      } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });

  return program;
}

// Run CLI if called directly
if (import.meta.main) {
  const program = createCLI();
  program.parse();
}

// Export for use as module
export { MochiClient, type Card, type Deck, type Template };
