/**
 * Drizzle schema definitions for core application tables.
 */

import {
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const userRoleEnum = pgEnum('user_role', ['owner', 'family', 'friend']);
export const shoppingListStatusEnum = pgEnum('shopping_list_status', [
  'active',
  'completed',
  'archived',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const passkeys = pgTable('passkeys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up').notNull().default(false),
  transports: jsonb('transports').$type<JsonValue>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  filePath: text('file_path').notNull().unique(),
  gitCommitHash: text('git_commit_hash').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  servings: integer('servings'),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  totalTime: integer('total_time'),
  difficulty: text('difficulty'),
  cuisine: text('cuisine'),
  course: text('course'),
  ingredients: jsonb('ingredients').$type<JsonValue>(),
  cookware: jsonb('cookware').$type<JsonValue>(),
  steps: jsonb('steps').$type<JsonValue>(),
  tags: jsonb('tags').$type<JsonValue>(),
  primaryPhotoUrl: text('primary_photo_url'),
  photoUrls: jsonb('photo_urls').$type<JsonValue>(),
  searchVector: tsvector('search_vector'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
});

export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: shoppingListStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  shoppingListId: uuid('shopping_list_id')
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  ingredientName: text('ingredient_name').notNull(),
  quantity: text('quantity'),
  unit: text('unit'),
  category: text('category'),
  isChecked: boolean('is_checked').notNull().default(false),
  checkedAt: timestamp('checked_at', { withTimezone: true }),
  checkedByUserId: uuid('checked_by_user_id').references(() => users.id),
  sourceRecipeId: uuid('source_recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  isManuallyAdded: boolean('is_manually_added').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shoppingListRecipes = pgTable('shopping_list_recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  shoppingListId: uuid('shopping_list_id')
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  servingsMultiplier: numeric('servings_multiplier'),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recipeFavorites = pgTable('recipe_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recipeHistory = pgTable('recipe_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  cookedAt: timestamp('cooked_at', { withTimezone: true }),
  notes: text('notes'),
  rating: integer('rating'),
});

export const recipeNotes = pgTable('recipe_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
