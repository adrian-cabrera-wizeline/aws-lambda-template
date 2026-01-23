import { z } from 'zod';

export const PriceRequestSchema = z.object({
  queryStringParameters: z.object({
    id: z.string().min(1).regex(/^[A-Z0-9-]+$/, "Invalid Format"),
    userId: z.string().uuid("Invalid User UUID")
  }).required()
});

export type PriceRequest = z.infer<typeof PriceRequestSchema>;