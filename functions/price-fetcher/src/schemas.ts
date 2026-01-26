import { z } from 'zod';
import { MAX_PRODUCT_PRICE, MIN_NAME_LENGTH, ERRORS } from './constants';

export const CreateProductSchema = z.object({
    name: z.string().min(MIN_NAME_LENGTH, ERRORS.INVALID_NAME),
    price: z.number().positive().max(MAX_PRODUCT_PRICE, ERRORS.PRICE_TOO_HIGH),
    category: z.enum(['ELECTRONICS', 'BOOKS', 'CLOTHING']).optional(),
    description: z.string().max(500).optional()
});

export const UpdateProductSchema = z.object({
    name: z.string().min(MIN_NAME_LENGTH).optional(),
    price: z.number().positive().max(MAX_PRODUCT_PRICE).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional()
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export interface Product extends CreateProductInput {
    id: string;
    //  Soft Delete means we switch to 'DELETED' instead of removing the row
    status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
    createdAt: string;
    updatedAt: string;
}