import { z } from 'zod';

// Input Validation
export const PriceRequestSchema = z.object({
  queryStringParameters: z.object({
    id: z.string().min(1).regex(/^[A-Z0-9-]+$/),
    userId: z.string().uuid()
  }).required()
});

export type PriceRequest = z.infer<typeof PriceRequestSchema>;