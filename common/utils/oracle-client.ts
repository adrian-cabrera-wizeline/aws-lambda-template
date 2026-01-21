import oracledb, { Pool } from 'oracledb';
import { logger } from '../middleware/logger';

let pool: Pool | null = null;

export const getOraclePool = async (): Promise<Pool> => {
  if (pool) return pool;

  logger.info("Initializing Oracle Pool...");
  
  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`,
    poolMin: 1, poolMax: 1
  });

  return pool;
};