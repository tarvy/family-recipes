/**
 * Shopping list service layer.
 *
 * High-level operations for creating and managing shopping lists.
 * This is the primary interface for MCP tools, API routes, and UI.
 */

import type { Types as MongooseTypes } from 'mongoose';
import { ShoppingList } from '@/db/models/shopping-list.model';
import type { IShoppingListDocument, IShoppingListItem } from '@/db/types';
import { getRecipeBySlug, type RecipeDetail } from '@/lib/recipes/loader';
import {
  type AggregatedIngredient,
  aggregateIngredients,
  type RecipeIngredients,
} from './aggregator';
import {
  categorizeIngredient,
  type GroceryCategory,
  getCategoriesWithItems,
  groupByCategory,
} from './categories';

/** Extended shopping list item with Mongoose subdocument _id */
interface ShoppingListItemWithId extends IShoppingListItem {
  _id?: MongooseTypes.ObjectId;
}

/**
 * Input for creating a new shopping list
 */
export interface ShoppingListInput {
  name?: string | undefined;
  recipeSlugs: string[];
  servingsMultipliers?: Record<string, number> | undefined;
  userId: MongooseTypes.ObjectId;
}

/**
 * Result of shopping list operations
 */
export interface ShoppingListResult {
  id: string;
  name: string;
  items: AggregatedIngredient[];
  itemsByCategory: Partial<Record<GroceryCategory, AggregatedIngredient[]>>;
  categoriesWithItems: GroceryCategory[];
  recipeCount: number;
  itemCount: number;
  checkedItemIds: Set<string>;
}

/**
 * Convert a recipe detail to the format needed for aggregation
 */
function recipeDetailToIngredients(recipe: RecipeDetail, multiplier: number): RecipeIngredients {
  return {
    slug: recipe.slug,
    ingredients: recipe.ingredients,
    servingsMultiplier: multiplier,
  };
}

/**
 * Convert database document to result format
 */
function documentToResult(doc: IShoppingListDocument): ShoppingListResult {
  // Convert stored items to aggregated format
  // Cast to extended type to access Mongoose subdocument _id
  const itemsWithIds = doc.items as ShoppingListItemWithId[];
  const items: AggregatedIngredient[] = itemsWithIds.map((item) => ({
    id: item._id?.toString() ?? item.ingredientName,
    name: item.ingredientName,
    quantities: [],
    displayQuantity: item.quantity ?? '',
    category: (item.category as GroceryCategory) ?? 'other',
  }));

  const itemsByCategory = groupByCategory(items);
  const categoriesWithItems = getCategoriesWithItems(itemsByCategory);

  const checkedItemIds = new Set<string>();
  for (const item of itemsWithIds) {
    if (item.isChecked) {
      checkedItemIds.add(item._id?.toString() ?? item.ingredientName);
    }
  }

  return {
    id: doc._id.toString(),
    name: doc.name,
    items,
    itemsByCategory,
    categoriesWithItems,
    recipeCount: doc.recipes.length,
    itemCount: items.length,
    checkedItemIds,
  };
}

/**
 * Create a new shopping list from recipes.
 *
 * Fetches recipe data, aggregates ingredients, and persists to database.
 *
 * @param input - List name, recipe slugs, and optional servings multipliers
 * @returns Created shopping list result
 */
export async function createShoppingList(input: ShoppingListInput): Promise<ShoppingListResult> {
  const { name, recipeSlugs, servingsMultipliers = {}, userId } = input;

  // Fetch all recipe details
  const recipes: RecipeIngredients[] = [];
  for (const slug of recipeSlugs) {
    const recipe = await getRecipeBySlug(slug);
    if (recipe) {
      const multiplier = servingsMultipliers[slug] ?? 1;
      recipes.push(recipeDetailToIngredients(recipe, multiplier));
    }
  }

  // Aggregate ingredients
  const aggregated = aggregateIngredients(recipes);

  // Convert to database items
  const items: IShoppingListItem[] = aggregated.map((agg) => ({
    ingredientName: agg.name,
    quantity: agg.displayQuantity,
    category: agg.category,
    isChecked: false,
    isManuallyAdded: false,
    createdAt: new Date(),
  }));

  // Create database document
  const listName = name ?? `Shopping List - ${new Date().toLocaleDateString()}`;
  const doc = await ShoppingList.create({
    userId,
    name: listName,
    status: 'active',
    items,
    recipes: recipeSlugs.map((slug) => ({
      recipeId: null, // We don't have recipe IDs in this file-based system
      servingsMultiplier: servingsMultipliers[slug] ?? 1,
      addedAt: new Date(),
    })),
  });

  const itemsByCategory = groupByCategory(aggregated);
  const categoriesWithItems = getCategoriesWithItems(itemsByCategory);

  return {
    id: doc._id.toString(),
    name: doc.name,
    items: aggregated,
    itemsByCategory,
    categoriesWithItems,
    recipeCount: recipes.length,
    itemCount: aggregated.length,
    checkedItemIds: new Set(),
  };
}

/**
 * Get a shopping list by ID.
 *
 * @param listId - Shopping list ID
 * @returns Shopping list result or null if not found
 */
export async function getShoppingList(listId: string): Promise<ShoppingListResult | null> {
  const doc = await ShoppingList.findById(listId);
  if (!doc) {
    return null;
  }
  return documentToResult(doc);
}

/**
 * Get all active shopping lists for a user.
 *
 * @param userId - User ID
 * @returns Array of shopping list results
 */
export async function getUserShoppingLists(
  userId: MongooseTypes.ObjectId,
): Promise<ShoppingListResult[]> {
  const docs = await ShoppingList.find({ userId, status: 'active' }).sort({ updatedAt: -1 });
  return docs.map(documentToResult);
}

/**
 * Toggle the checked status of an item.
 *
 * @param listId - Shopping list ID
 * @param itemId - Item ID within the list
 * @returns Updated item checked status
 */
export async function toggleItem(listId: string, itemId: string): Promise<boolean> {
  const doc = await ShoppingList.findById(listId);
  if (!doc) {
    throw new Error('Shopping list not found');
  }

  // Use Mongoose subdocument array's id() method
  const itemsArray = doc.items as unknown as { id: (id: string) => ShoppingListItemWithId | null };
  const item = itemsArray.id(itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  item.isChecked = !item.isChecked;
  if (item.isChecked) {
    item.checkedAt = new Date();
  } else {
    // Use type assertion to bypass exactOptionalPropertyTypes for Mongoose subdoc
    (item as unknown as { checkedAt: Date | undefined }).checkedAt = undefined;
  }

  await doc.save();
  return item.isChecked;
}

/**
 * Add a manually-entered item to a shopping list.
 *
 * @param listId - Shopping list ID
 * @param item - Item name and optional quantity
 */
export async function addManualItem(
  listId: string,
  item: { name: string; quantity?: string | undefined },
): Promise<void> {
  const doc = await ShoppingList.findById(listId);
  if (!doc) {
    throw new Error('Shopping list not found');
  }

  const newItem: Partial<IShoppingListItem> = {
    ingredientName: item.name,
    category: categorizeIngredient(item.name),
    isChecked: false,
    isManuallyAdded: true,
    createdAt: new Date(),
  };

  // Only add quantity if defined
  if (item.quantity !== undefined) {
    newItem.quantity = item.quantity;
  }

  doc.items.push(newItem as IShoppingListItem);
  await doc.save();
}

/**
 * Remove all checked items from a shopping list.
 *
 * @param listId - Shopping list ID
 * @returns Number of items removed
 */
export async function clearCheckedItems(listId: string): Promise<number> {
  const doc = await ShoppingList.findById(listId);
  if (!doc) {
    throw new Error('Shopping list not found');
  }

  const originalCount = doc.items.length;
  doc.items = doc.items.filter((item) => !item.isChecked) as typeof doc.items;
  await doc.save();

  return originalCount - doc.items.length;
}

/**
 * Delete a shopping list.
 *
 * @param listId - Shopping list ID
 */
export async function deleteShoppingList(listId: string): Promise<void> {
  await ShoppingList.findByIdAndDelete(listId);
}

/**
 * Archive a shopping list.
 *
 * @param listId - Shopping list ID
 */
export async function archiveShoppingList(listId: string): Promise<void> {
  await ShoppingList.findByIdAndUpdate(listId, { status: 'archived' });
}
