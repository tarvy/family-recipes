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
  AllowedEmailRole,
  AssignmentSource,
  AuditLevel,
  AuditOperation,
  AuditSource,
  DayOfWeek,
  DiscoveryAction,
  DiscoverySource,
  IAllowedEmail,
  IAllowedEmailDocument,
  IAuditActor,
  IAuditLog,
  IAuditLogDocument,
  IAuditResource,
  ICookware,
  IDiscoveryRecipe,
  IDiscoveryRecipeDocument,
  IDiscoveryRecipeIngredient,
  IIngredient,
  IMagicLink,
  IMagicLinkDocument,
  IOAuthClient,
  IOAuthClientDocument,
  IOAuthCode,
  IOAuthCodeDocument,
  IOAuthRefreshToken,
  IOAuthRefreshTokenDocument,
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
  IUserDiscoveryState,
  IUserDiscoveryStateDocument,
  IUserDocument,
  IWeeklyMenu,
  IWeeklyMenuAssignment,
  IWeeklyMenuDocument,
  IWeeklyMenuVote,
  MealSlot,
  ShoppingListStatus,
  UserRole,
  WeeklyMenuStatus,
} from '../types';
export { AllowedEmail } from './allowed-email.model';
export { AuditLog } from './audit-log.model';
export { DiscoveryRecipe } from './discovery-recipe.model';
export { MagicLink } from './magic-link.model';
export { OAuthClient } from './oauth-client.model';
export { OAuthCode } from './oauth-code.model';
export { OAuthRefreshToken } from './oauth-token.model';
export { Passkey } from './passkey.model';
export { findRecipesByIngredient, Recipe, searchRecipes } from './recipe.model';
export { RecipeFavorite } from './recipe-favorite.model';
export { RecipeHistory } from './recipe-history.model';
export { RecipeNote } from './recipe-note.model';
export { Session } from './session.model';
export { ShoppingList } from './shopping-list.model';
export { User } from './user.model';
export { UserDiscoveryState } from './user-discovery-state.model';
export { WeeklyMenu } from './weekly-menu.model';
