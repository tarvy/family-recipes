/**
 * TypeScript interfaces for MongoDB documents.
 *
 * These interfaces define the shape of documents in the database,
 * providing type safety when working with Mongoose models.
 */

import type { Document, Types } from 'mongoose';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type UserRole = 'owner' | 'family' | 'friend';

export type AllowedEmailRole = UserRole;

export type ShoppingListStatus = 'active' | 'completed' | 'archived';

// -----------------------------------------------------------------------------
// User & Auth
// -----------------------------------------------------------------------------

export interface IUser {
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

export interface IAllowedEmail {
  email: string;
  role: AllowedEmailRole;
  invitedBy?: Types.ObjectId | null;
  createdAt: Date;
  firstSignedInAt?: Date | null;
}

export interface IAllowedEmailDocument extends IAllowedEmail, Document {}

export interface ISession {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ISessionDocument extends ISession, Document {}

export interface IMagicLink {
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface IMagicLinkDocument extends IMagicLink, Document {}

export interface IPasskey {
  userId: Types.ObjectId;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType?: string;
  backedUp: boolean;
  transports?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IPasskeyDocument extends IPasskey, Document {}

// -----------------------------------------------------------------------------
// Recipes
// -----------------------------------------------------------------------------

export interface IIngredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface ICookware {
  name: string;
  quantity?: number;
}

export interface IStep {
  text: string;
  ingredients?: IIngredient[];
  cookware?: ICookware[];
  timers?: { duration: number; unit: string }[];
}

export interface IRecipe {
  filePath: string;
  gitCommitHash: string;
  title: string;
  slug: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: string;
  cuisine?: string;
  course?: string;
  ingredients: IIngredient[];
  cookware: ICookware[];
  steps: IStep[];
  tags: string[];
  primaryPhotoUrl?: string;
  photoUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

export interface IRecipeDocument extends IRecipe, Document {}

// -----------------------------------------------------------------------------
// Recipe Interactions
// -----------------------------------------------------------------------------

export interface IRecipeFavorite {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  createdAt: Date;
}

export interface IRecipeFavoriteDocument extends IRecipeFavorite, Document {}

export interface IRecipeHistory {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  cookedAt?: Date;
  notes?: string;
  rating?: number;
}

export interface IRecipeHistoryDocument extends IRecipeHistory, Document {}

export interface IRecipeNote {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipeNoteDocument extends IRecipeNote, Document {}

// -----------------------------------------------------------------------------
// Shopping Lists
// -----------------------------------------------------------------------------

export interface IShoppingListItem {
  ingredientName: string;
  quantity?: string;
  unit?: string;
  category?: string;
  isChecked: boolean;
  checkedAt?: Date;
  checkedByUserId?: Types.ObjectId;
  sourceRecipeId?: Types.ObjectId;
  isManuallyAdded: boolean;
  createdAt: Date;
}

export interface IShoppingListRecipe {
  recipeId: Types.ObjectId;
  servingsMultiplier?: number;
  addedAt: Date;
}

export interface IShoppingList {
  userId: Types.ObjectId;
  name: string;
  status: ShoppingListStatus;
  items: IShoppingListItem[];
  recipes: IShoppingListRecipe[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IShoppingListDocument extends IShoppingList, Document {}

// -----------------------------------------------------------------------------
// OAuth 2.1
// -----------------------------------------------------------------------------

export interface IOAuthClient {
  clientId: string;
  clientSecretHash?: string | null;
  name: string;
  redirectUris: string[];
  createdAt: Date;
}

export interface IOAuthClientDocument extends IOAuthClient, Document {}

export interface IOAuthCode {
  code: string;
  clientId: string;
  userId: Types.ObjectId;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface IOAuthCodeDocument extends IOAuthCode, Document {}

export interface IOAuthRefreshToken {
  tokenHash: string;
  clientId: string;
  userId: Types.ObjectId;
  scope: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface IOAuthRefreshTokenDocument extends IOAuthRefreshToken, Document {}
