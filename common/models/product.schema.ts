import { z } from 'zod';

// DOMAIN MODEL: Represents a valid row in the Database
export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number(),
    status: z.enum(['ACTIVE', 'INACTIVE']), // 👈 Enforced Status
    updatedAt: z.date(), // 👈 Internal Date Object
});

// AUDIT MODEL: Represents a valid entry in DynamoDB
export const AuditLogSchema = z.object({
    pk: z.string().startsWith('PRODUCT#'),
    sk: z.string().datetime(), // ISO 8601 String
    action: z.enum(['CREATE', 'UPDATE', 'DEACTIVATE']),
    userId: z.string(),
    snapshot: z.record(z.any()), // Flexible JSON payload
});