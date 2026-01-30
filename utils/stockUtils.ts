import { ProductIngredient, StockItem } from '../types';

export interface StockStatus {
    available: boolean;
    remaining: number; // The exact number of units that can be made
    lowestIngredient: string | null; // Name of the limiting ingredient
}

export const checkProductAvailability = (
    ingredients: ProductIngredient[],
    stockItems: Record<string, StockItem> // Using a map for faster lookup ID -> StockItem
): StockStatus => {
    // If no ingredients, it's always available (e.g., service or virtual item)
    if (!ingredients || ingredients.length === 0) {
        return { available: true, remaining: 9999, lowestIngredient: null };
    }

    let min_producible = Infinity;
    let limitingFactor = null;

    for (const ing of ingredients) {
        const stockItem = stockItems[ing.stock_item_id];

        // If stock item not found, assume 0 stock (safety)
        if (!stockItem) {
            return { available: false, remaining: 0, lowestIngredient: 'Insumo não encontrado' };
        }

        // Calculate how many times we can make the recipe based on this specific ingredient
        // Example: Have 1000g cheese, Need 100g.  1000 / 100 = 10 units.
        const possibleUnits = Math.floor(stockItem.current_quantity / ing.quantity);

        if (possibleUnits < min_producible) {
            min_producible = possibleUnits;
            limitingFactor = stockItem.name;
        }
    }

    return {
        available: min_producible > 0,
        remaining: min_producible === Infinity ? 0 : min_producible,
        lowestIngredient: limitingFactor
    };
};
