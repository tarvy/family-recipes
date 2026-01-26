/**
 * Mongoose model exports.
 *
 * Usage:
 *   import { User, Recipe, ShoppingList } from '@/db/models';
 *   import { connectDB } from '@/db/connection';
 *
 *   await connectDB();
 *   const users = await User.find();
 */

// Re-export types for convenience
export type {
  ICookware,
  IIngredient,
  IMagicLink,
  IMagicLinkDocument,
  IPasskey,
  IPasskeyDocument,
  IRecipe,
  IRecipeDocument,
  IRecipeFavorite,
  IRecipeFavoriteDocument,
  IRecipeHistory,
  IRecipeHistoryDocument,
  IRecipeNote,
  IRecipeNoteDocument,
  ISession,
  ISessionDocument,
  IShoppingList,
  IShoppingListDocument,
  IShoppingListItem,
  IShoppingListRecipe,
  IStep,
  IUser,
  IUserDocument,
  ShoppingListStatus,
  UserRole,
} from '../types';
export { MagicLink } from './magic-link.model';
export { Passkey } from './passkey.model';
export { findRecipesByIngredient, Recipe, searchRecipes } from './recipe.model';
export { RecipeFavorite } from './recipe-favorite.model';
export { RecipeHistory } from './recipe-history.model';
export { RecipeNote } from './recipe-note.model';
export { Session } from './session.model';
export { ShoppingList } from './shopping-list.model';
export { User } from './user.model';
