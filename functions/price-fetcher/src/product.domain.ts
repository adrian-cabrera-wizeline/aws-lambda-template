import { v4 as uuidv4 } from 'uuid';
import { CreateProductInput, UpdateProductInput, Product } from './schemas';

// 1. CREATE RULE
export const createProduct = (input: CreateProductInput): Product => {
    const now = new Date().toISOString();
    return {
        id: uuidv4(),
        ...input,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
    };
};

// 2. UPDATE RULE
// (Pure function: Takes current state + changes -> Returns new state)
export const updateProduct = (current: Product, changes: UpdateProductInput): Product => {
    // Business Rule Example: You can't update a deleted product
    if (current.status === 'DELETED') {
        throw new Error("Cannot update a deleted product");
    }

    return {
        ...current,
        ...changes,
        updatedAt: new Date().toISOString()
    };
};

// 3. DELETE RULE (Soft Delete)
export const markAsDeleted = (current: Product): Product => {
    if (current.status === 'DELETED') {
        // Idempotency: If already deleted, just return it as is (or throw, depending on preference)
        return current; 
    }
    
    return {
        ...current,
        status: 'DELETED',
        updatedAt: new Date().toISOString()
    };
};