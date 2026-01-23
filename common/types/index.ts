// 1. Re-export Zod Models (The "One-Stop Shop" pattern)
export * from '../models/product.schema';
import { Context } from 'aws-lambda';
import { Connection } from 'oracledb';

export interface AuditLogItem {
  userId: string;
  action: 'PRICE_FETCH' | 'CONFIG_UPDATE' | 'LOGIN_ATTEMPT';
  resourceId: string;
  status: 'SUCCESS' | 'FAILURE' | 'NOT_FOUND';
  timestamp: string;
  details?: Record<string, any>; // Optional extra JSON data
}

export interface CustomContext extends Context {
  db: Connection; // 👈 This tells TS that 'context.db' exists and is an Oracle Connection
}