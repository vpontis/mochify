#!/usr/bin/env bun
import { Command } from 'commander';
import { MochiClient, type Card, type Deck } from './mochi-client';
import { z } from 'zod';

// Load API key
const API_KEY = process.env.MOCHI_API_KEY;
if (!API_KEY) {
  console.error('❌ MOCHI_API_KEY not found in environment variables');
  console.error('Please set it in .env.local or export it');
  process.exit(1);
}

const client = new MochiClient(API_KEY);
const program = new Command();

program
  .name('mochi')
  .description('🍡 CLI for Mochi Cards - Create and manage flashcards programmatically')
  .version('1.0.0');

// Deck commands
const deckCmd = program
  .command('deck')
  .description('Manage decks');

deckCmd
  .command('list')
  .description('List all decks')
  .action(async () => {
    try {
      const decks = await client.listDecks();
      console.log('\n📚 Your Mochi Decks:');
      
      // Group decks by parent
      const rootDecks = decks.filter(d => !d['parent-id']);
      const childDecks = decks.filter(d => d['parent-id']);
      
      rootDecks.forEach(deck => {
        console.log(`├─ ${deck.name} (${deck.id})`);
        childDecks
          .filter(child => child['parent-id'] === deck.id)
          .forEach(child => {
            console.log(`│  └─ ${child.name} (${child.id})`);
          });
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

deckCmd
  .command('create <name>')
  .description('Create a new deck')
  .option('-p, --parent <id>', 'Parent deck ID')
  .action(async (name: string, options: { parent?: string }) => {
    try {
      const deck = await client.createDeck({
        name,
        'parent-id': options.parent,
      });
      console.log(`✅ Created deck: ${deck.name} (${deck.id})`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

deckCmd
  .command('get <id>')
  .description('Get deck details')
  .action(async (id: string) => {
    try {
      const deck = await client.getDeck(id);
      console.log('\n📁 Deck Details:');
      console.log(`  Name: ${deck.name}`);
      console.log(`  ID: ${deck.id}`);
      console.log(`  Parent: ${deck['parent-id'] || 'None'}`);
      console.log(`  Archived: ${deck.archived || false}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Card commands
const cardCmd = program
  .command('card')
  .description('Manage cards');

cardCmd
  .command('list')
  .description('List cards')
  .option('-d, --deck <id>', 'Filter by deck ID')
  .option('-l, --limit <number>', 'Number of cards to show', '20')
  .action(async (options: { deck?: string; limit: string }) => {
    try {
      const cards = await client.listCards(options.deck, parseInt(options.limit));
      console.log(`\n📝 Cards${options.deck ? ' in deck' : ''}:`);
      cards.forEach(card => {
        const preview = card.content.split('\n')[0].slice(0, 60);
        const tags = card.tags?.length ? ` [${card.tags.join(', ')}]` : '';
        console.log(`├─ ${card.id}: ${preview}...${tags}`);
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

cardCmd
  .command('create <deck-id> <content>')
  .description('Create a new card')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--template <id>', 'Template ID')
  .action(async (deckId: string, content: string, options: { tags?: string; template?: string }) => {
    try {
      const card = await client.createCard({
        content,
        'deck-id': deckId,
        'template-id': options.template,
        tags: options.tags?.split(',').map(t => t.trim()),
      });
      console.log(`✅ Created card: ${card.id}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

cardCmd
  .command('qa <deck-id>')
  .description('Create a Q&A card interactively or from arguments')
  .option('-q, --question <question>', 'Question text')
  .option('-a, --answer <answer>', 'Answer text')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .action(async (deckId: string, options: { question?: string; answer?: string; tags?: string }) => {
    try {
      let question = options.question;
      let answer = options.answer;
      
      if (!question || !answer) {
        // Interactive mode
        console.log('📝 Enter Q&A card details:');
        question = question || prompt('Question: ') || '';
        answer = answer || prompt('Answer: ') || '';
      }
      
      if (!question || !answer) {
        console.error('❌ Question and answer are required');
        process.exit(1);
      }
      
      const content = `${question}\n\n---\n\n${answer}`;
      const card = await client.createCard({
        content,
        'deck-id': deckId,
        tags: options.tags?.split(',').map(t => t.trim()),
      });
      
      console.log(`✅ Created Q&A card: ${card.id}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

cardCmd
  .command('bulk <deck-id> <file>')
  .description('Bulk create cards from JSON file')
  .option('--dry-run', 'Preview cards without creating them')
  .action(async (deckId: string, filePath: string, options: { dryRun?: boolean }) => {
    try {
      const file = Bun.file(filePath);
      const data = await file.json();
      
      if (!Array.isArray(data)) {
        console.error('❌ JSON file must contain an array of cards');
        process.exit(1);
      }
      
      console.log(`📦 ${options.dryRun ? 'Preview' : 'Creating'} ${data.length} cards...`);
      
      if (options.dryRun) {
        data.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.question || item.content?.slice(0, 50)}...`);
          if (item.tags) console.log(`   Tags: ${item.tags.join(', ')}`);
        });
        return;
      }
      
      let created = 0;
      let failed = 0;
      
      for (const item of data) {
        try {
          let content = item.content;
          
          if ('question' in item && 'answer' in item) {
            content = `${item.question}\n\n---\n\n${item.answer}`;
          }
          
          if (!content) {
            console.error(`⚠️  Skipping item ${created + failed + 1}: No content`);
            failed++;
            continue;
          }
          
          await client.createCard({
            content,
            'deck-id': deckId,
            tags: item.tags,
          });
          
          created++;
          process.stdout.write(`\r✅ Progress: ${created}/${data.length} created`);
        } catch (error) {
          failed++;
          console.error(`\n❌ Failed item ${created + failed}: ${error}`);
        }
      }
      
      console.log('\n\n📊 Bulk import complete:');
      console.log(`  ✅ Created: ${created} cards`);
      if (failed > 0) console.log(`  ❌ Failed: ${failed} cards`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

cardCmd
  .command('delete <id>')
  .description('Delete a card')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id: string, options: { force?: boolean }) => {
    try {
      if (!options.force) {
        const confirm = prompt(`Are you sure you want to delete card ${id}? (y/N): `);
        if (confirm?.toLowerCase() !== 'y') {
          console.log('Cancelled');
          return;
        }
      }
      
      await client.deleteCard(id);
      console.log(`✅ Deleted card: ${id}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Template commands
const templateCmd = program
  .command('template')
  .description('Manage templates');

templateCmd
  .command('list')
  .description('List all templates')
  .action(async () => {
    try {
      const templates = await client.listTemplates();
      console.log('\n📋 Available Templates:');
      templates.forEach(template => {
        console.log(`\n├─ ${template.name} (${template.id})`);
        if (template.fields && typeof template.fields === 'object') {
          Object.values(template.fields as any).forEach((field: any) => {
            console.log(`│  └─ ${field.name} (${field.id})`);
          });
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

templateCmd
  .command('create-with <template-id> <deck-id>')
  .description('Create a card using a template with fields')
  .option('-f, --fields <json>', 'Field values as JSON')
  .action(async (templateId: string, deckId: string, options: { fields?: string }) => {
    try {
      // Get template to show field names
      const template = await client.getTemplate(templateId);
      
      if (!options.fields) {
        console.log('Template fields:');
        if (template.fields && typeof template.fields === 'object') {
          Object.values(template.fields as any).forEach((field: any) => {
            console.log(`  - ${field.name} (${field.id})`);
          });
        }
        console.log('\nProvide field values with --fields as JSON');
        console.log('Example: --fields \'{"name": "Front text", "V72yjxYh": "Back text"}\'');
        return;
      }
      
      const fieldValues = JSON.parse(options.fields);
      const fields: Record<string, { id: string; value: string }> = {};
      
      for (const [key, value] of Object.entries(fieldValues)) {
        fields[key] = { id: key, value: value as string };
      }
      
      const card = await client.createCard({
        content: '',
        'deck-id': deckId,
        'template-id': templateId,
        fields,
      });
      
      console.log(`✅ Created card with template: ${card.id}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    try {
      const decks = await client.listDecks();
      const allCards = await client.listCards(undefined, 100);
      
      console.log('\n📊 Mochi Statistics:');
      console.log(`  📚 Total decks: ${decks.length}`);
      console.log(`  📝 Recent cards: ${allCards.length}`);
      
      // Count cards by deck
      const cardsByDeck: Record<string, number> = {};
      allCards.forEach(card => {
        cardsByDeck[card['deck-id']] = (cardsByDeck[card['deck-id']] || 0) + 1;
      });
      
      console.log('\n  Cards per deck:');
      decks.forEach(deck => {
        const count = cardsByDeck[deck.id] || 0;
        if (count > 0) {
          console.log(`    - ${deck.name}: ${count} cards`);
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .description('Interactive card creation mode')
  .action(async () => {
    try {
      console.log('🍡 Mochi Interactive Mode\n');
      
      // List decks
      const decks = await client.listDecks();
      console.log('Select a deck:');
      decks.forEach((deck, index) => {
        console.log(`  ${index + 1}. ${deck.name}`);
      });
      
      const deckIndex = parseInt(prompt('\nDeck number: ') || '0') - 1;
      if (deckIndex < 0 || deckIndex >= decks.length) {
        console.error('Invalid deck selection');
        process.exit(1);
      }
      
      const selectedDeck = decks[deckIndex];
      console.log(`\n📚 Selected: ${selectedDeck.name}\n`);
      
      // Create cards loop
      while (true) {
        console.log('Create a card (or type "exit" to quit):');
        const question = prompt('Question/Front: ');
        
        if (question === 'exit' || !question) break;
        
        const answer = prompt('Answer/Back: ');
        if (!answer) continue;
        
        const tags = prompt('Tags (comma-separated, optional): ');
        
        try {
          const content = `${question}\n\n---\n\n${answer}`;
          await client.createCard({
            content,
            'deck-id': selectedDeck.id,
            tags: tags?.split(',').map(t => t.trim()).filter(Boolean),
          });
          console.log('✅ Card created!\n');
        } catch (error) {
          console.error(`❌ Failed to create card: ${error}\n`);
        }
      }
      
      console.log('\n👋 Goodbye!');
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();