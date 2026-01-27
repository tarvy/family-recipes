/**
 * Grocery category definitions and categorization logic.
 *
 * Pure functions for organizing ingredients by grocery store section.
 */

/**
 * Grocery store sections in a logical shopping order
 */
export const GROCERY_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'bakery',
  'pantry',
  'frozen',
  'beverages',
  'condiments',
  'spices',
  'other',
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

/**
 * Category display names for UI
 */
export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  meat: 'Meat & Poultry',
  seafood: 'Seafood',
  bakery: 'Bakery',
  pantry: 'Pantry',
  frozen: 'Frozen',
  beverages: 'Beverages',
  condiments: 'Condiments & Sauces',
  spices: 'Spices & Seasonings',
  other: 'Other',
};

/**
 * Keywords used to categorize ingredients by name
 */
export const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  produce: [
    'apple',
    'apricot',
    'artichoke',
    'arugula',
    'asparagus',
    'avocado',
    'banana',
    'basil',
    'bean sprout',
    'beet',
    'bell pepper',
    'berry',
    'blackberry',
    'blueberry',
    'bok choy',
    'broccoli',
    'brussels sprout',
    'cabbage',
    'cantaloupe',
    'carrot',
    'cauliflower',
    'celery',
    'cherry',
    'chive',
    'cilantro',
    'corn',
    'cranberry',
    'cucumber',
    'dill',
    'eggplant',
    'fennel',
    'fig',
    'garlic',
    'ginger',
    'grape',
    'grapefruit',
    'green bean',
    'green onion',
    'herbs',
    'honeydew',
    'jalapeno',
    'kale',
    'kiwi',
    'leek',
    'lemon',
    'lettuce',
    'lime',
    'mango',
    'melon',
    'mint',
    'mushroom',
    'nectarine',
    'onion',
    'orange',
    'oregano',
    'parsley',
    'parsnip',
    'peach',
    'pear',
    'peas',
    'pepper',
    'pineapple',
    'plum',
    'pomegranate',
    'potato',
    'radish',
    'raspberry',
    'romaine',
    'rosemary',
    'sage',
    'scallion',
    'shallot',
    'spinach',
    'squash',
    'strawberry',
    'sweet potato',
    'thyme',
    'tomato',
    'turnip',
    'watermelon',
    'zucchini',
  ],
  dairy: [
    'butter',
    'buttermilk',
    'cheddar',
    'cheese',
    'cottage cheese',
    'cream',
    'cream cheese',
    'crème fraîche',
    'egg',
    'feta',
    'goat cheese',
    'gouda',
    'greek yogurt',
    'gruyere',
    'half and half',
    'heavy cream',
    'mascarpone',
    'milk',
    'mozzarella',
    'parmesan',
    'provolone',
    'ricotta',
    'sour cream',
    'swiss cheese',
    'whipped cream',
    'whipping cream',
    'yogurt',
  ],
  meat: [
    'bacon',
    'beef',
    'brisket',
    'chicken',
    'chorizo',
    'duck',
    'ground beef',
    'ground pork',
    'ground turkey',
    'ham',
    'hot dog',
    'kielbasa',
    'lamb',
    'pancetta',
    'pepperoni',
    'pork',
    'prosciutto',
    'ribs',
    'salami',
    'sausage',
    'steak',
    'turkey',
    'veal',
  ],
  seafood: [
    'anchovy',
    'bass',
    'calamari',
    'catfish',
    'clam',
    'cod',
    'crab',
    'crawfish',
    'fish',
    'halibut',
    'lobster',
    'mackerel',
    'mussel',
    'octopus',
    'oyster',
    'salmon',
    'sardine',
    'scallop',
    'sea bass',
    'shrimp',
    'snapper',
    'squid',
    'swordfish',
    'tilapia',
    'trout',
    'tuna',
  ],
  bakery: [
    'bagel',
    'baguette',
    'bread',
    'brioche',
    'bun',
    'ciabatta',
    'cornbread',
    'croissant',
    'english muffin',
    'flatbread',
    'focaccia',
    'hamburger bun',
    'hot dog bun',
    'naan',
    'pita',
    'pretzel',
    'roll',
    'sourdough',
    'tortilla',
  ],
  pantry: [
    'almond',
    'barley',
    'bean',
    'black bean',
    'brown rice',
    'brown sugar',
    'canned',
    'cashew',
    'cereal',
    'chickpea',
    'chip',
    'chocolate',
    'cocoa',
    'coconut',
    'couscous',
    'cracker',
    'dried',
    'farro',
    'flour',
    'granola',
    'hazelnut',
    'honey',
    'jam',
    'jelly',
    'kidney bean',
    'lentil',
    'maple syrup',
    'noodle',
    'nut',
    'oat',
    'olive',
    'pasta',
    'peanut',
    'peanut butter',
    'pecan',
    'pine nut',
    'quinoa',
    'raisin',
    'rice',
    'sesame',
    'spaghetti',
    'sugar',
    'sunflower seed',
    'syrup',
    'tahini',
    'walnut',
    'white rice',
  ],
  frozen: ['frozen', 'ice cream', 'popsicle', 'sorbet'],
  beverages: [
    'beer',
    'brandy',
    'champagne',
    'cider',
    'club soda',
    'coconut milk',
    'coffee',
    'espresso',
    'gin',
    'juice',
    'lemonade',
    'liqueur',
    'rum',
    'sake',
    'soda',
    'sparkling water',
    'tea',
    'tequila',
    'tonic',
    'vodka',
    'whiskey',
    'wine',
  ],
  condiments: [
    'barbecue sauce',
    'bbq sauce',
    'dijon',
    'fish sauce',
    'hoisin',
    'horseradish',
    'hot sauce',
    'ketchup',
    'marinade',
    'mayonnaise',
    'miso',
    'mustard',
    'oyster sauce',
    'ranch',
    'relish',
    'salsa',
    'soy sauce',
    'sriracha',
    'tamari',
    'teriyaki',
    'vinaigrette',
    'vinegar',
    'worcestershire',
  ],
  spices: [
    'allspice',
    'anise',
    'bay leaf',
    'black pepper',
    'bouillon',
    'cardamom',
    'cayenne',
    'chili flake',
    'chili powder',
    'cinnamon',
    'clove',
    'coriander',
    'cumin',
    'curry',
    'dill seed',
    'extract',
    'fennel seed',
    'garam masala',
    'garlic powder',
    'italian seasoning',
    'mustard seed',
    'nutmeg',
    'onion powder',
    'paprika',
    'pepper',
    'peppercorn',
    'red pepper flake',
    'saffron',
    'salt',
    'seasoning',
    'smoked paprika',
    'spice',
    'star anise',
    'turmeric',
    'vanilla',
    'white pepper',
  ],
  other: [],
};

/**
 * Categorize an ingredient by its name using keyword matching.
 *
 * @param name - Ingredient name to categorize
 * @returns The most likely grocery category
 */
export function categorizeIngredient(name: string): GroceryCategory {
  const normalized = name.toLowerCase().trim();

  for (const category of GROCERY_CATEGORIES) {
    // Skip 'other' - it's our fallback
    if (category === 'other') {
      continue;
    }

    const keywords = CATEGORY_KEYWORDS[category];
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return 'other';
}

/**
 * Group items by their grocery category.
 *
 * @param items - Array of items with a category property
 * @returns Record mapping category to items in that category
 */
export function groupByCategory<T extends { category: GroceryCategory }>(
  items: T[],
): Partial<Record<GroceryCategory, T[]>> {
  const grouped: Partial<Record<GroceryCategory, T[]>> = {};

  for (const item of items) {
    const category = item.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  }

  return grouped;
}

/**
 * Get categories that have items, in shopping order.
 *
 * @param grouped - Grouped items from groupByCategory
 * @returns Array of categories that have items
 */
export function getCategoriesWithItems<T>(
  grouped: Partial<Record<GroceryCategory, T[]>>,
): GroceryCategory[] {
  return GROCERY_CATEGORIES.filter((cat) => {
    const items = grouped[cat];
    return items && items.length > 0;
  });
}
