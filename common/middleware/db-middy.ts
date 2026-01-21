import middy from '@middy/core';
import { getOraclePool } from '../utils/oracle-client';
import { logger } from './logger';

export const oracleMiddleware = (): middy.MiddlewareObj<any, any> => ({
  before: async (request) => {
    try {
      const pool = await getOraclePool();
      Object.assign(request.context, { db: await pool.getConnection() });
    } catch (e) {
      logger.error("DB Connection Failed", e as Error);
      throw e;
    }
  },
  after: async (request) => {
    const conn = (request.context as any).db;
    if (conn) await conn.close();
  },
  onError: async (request) => {
    const conn = (request.context as any).db;
    if (conn) {
      try { await conn.close(); } catch (e) { logger.error("DB Close Error", e as Error); }
    }
  }
});