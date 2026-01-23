import { z } from 'zod';
import { ProductSchema, AuditLogSchema } from '../models/product.schema';


// 1. THE "AUTO-GENERATED" PART (Zod Inference)

// 🟢 You write this line ONCE.
// 🟢 TypeScript automatically figures out the shape.
// 🟢 If you add "color: z.string()" to ProductSchema, this type gets "color: string" instantly.
export type Product = z.infer<typeof ProductSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;


// 2. THE MANUAL PART (Database Rows)

// 🔴 Zod cannot see your Oracle Database.
// 🔴 You must manually define what the Raw SQL returns (usually Uppercase).
export interface OracleProductRow {
    ID: string;
    NAME: string;
    PRICE: number;
    STATUS: string;
    UPDATED_AT: Date;
}