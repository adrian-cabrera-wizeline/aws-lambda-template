import { z } from 'zod';

// 1. Define the Schema (Runtime Validation)
export const ProductSchema = z.object({
  productId: z.string(),
  name: z.string().optional(),
  price: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  lastUpdated: z.date().optional()
});

// 2. Export the Type (Compile-time)
// Any code importing this gets the TypeScript type automatically inferred from Zod
export type Product = z.infer<typeof ProductSchema>;