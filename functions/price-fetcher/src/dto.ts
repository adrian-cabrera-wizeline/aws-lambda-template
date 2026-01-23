import { z } from 'zod';

// CREATE (POST)
// User sends strictly this. No ID allowed.
export const CreateProductSchema = z.object({
    name: z.string()
        .min(3, { message: "Product name must be at least 3 characters long" })
        .max(100, { message: "Product name is too long" }),
    price: z.number()
        .positive({ message: "Price must be greater than zero" })
        .multipleOf(0.01, { message: "Price can only have 2 decimal places" }), // e.g. 10.99
});

// UPDATE (PUT)
export const UpdatePriceSchema = z.object({
    id: z.string().uuid({ message: "Invalid UUID format" }),
    price: z.number()
        .positive()
        .multipleOf(0.01),
});

// GET / DELETE (Query Params)
export const ProductIdParamSchema = z.object({
    id: z.string().uuid(),
});

// Export inferred types for the Handler to use
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdatePriceInput = z.infer<typeof UpdatePriceSchema>;