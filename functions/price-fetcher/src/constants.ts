export const MAX_PRODUCT_PRICE = 10000;
export const MIN_NAME_LENGTH = 3;

export const ERRORS = {
    PRICE_TOO_HIGH: `Price cannot exceed ${MAX_PRODUCT_PRICE}`,
    INVALID_NAME: `Name must be at least ${MIN_NAME_LENGTH} characters`,
    PRODUCT_NOT_FOUND: 'Product not found',
    MISSING_ID: 'Product ID is required',
    ALREADY_DELETED: 'Product is already deleted'
} as const;