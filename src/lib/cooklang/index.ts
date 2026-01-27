/**
 * Cooklang parsing and serialization module
 *
 * Usage:
 *   import { parseCooklang, serializeToCooklang } from '@/lib/cooklang';
 *
 *   // Parse a .cook file
 *   const result = await parseCooklang(source, {
 *     filePath: 'recipes/tacos.cook',
 *     gitCommitHash: 'abc123',
 *   });
 *
 *   // Serialize back to Cooklang
 *   if (result.success) {
 *     const cooklangSource = serializeToCooklang(result.recipe);
 *   }
 */

export * from './constants';
export type { ParseContext, ParseError, ParseOutput, ParseResult } from './parser';
export { parseCooklang } from './parser';
export { serializeToCooklang, serializeToCooklangWithIngredientList } from './serializer';
