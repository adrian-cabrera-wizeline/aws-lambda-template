import { getOracleConnection } from '../../../common/utils/oracle-client';
// 💡 LEARN: We import 'Connection' type for TS IntelliSense, and 'oracledb' for constants.
import oracledb, { Connection } from 'oracledb';
import { tracer } from '../../../common/utils/observability-tools';
import { Product, OracleProductRow } from '../../../common/types';

export class OracleRepository {
    // This holds the connection if provided by Middleware
    private db?: Connection;

    /**
     * DEPENDENCY INJECTION
     * @param db - Optional. If provided (by Middleware), we use it. 
     * If missing (e.g., unit tests), we create a fresh one.
     */
    constructor(db?: Connection) {
        this.db = db;
    }

    @tracer.captureMethod()
    async create(id: string, name: string, price: number): Promise<void> {
        // 💡 LEARN: Logic to decide "Do I own this connection?"
        // If 'this.db' exists, Middleware owns it (don't close).
        // If 'this.db' is missing, we open a new one (must close).
        const shouldClose = !this.db;
        const conn = this.db || await getOracleConnection();

        try {
            await conn.execute(
                `INSERT INTO PRODUCTS (ID, NAME, PRICE, STATUS, UPDATED_AT) 
                 VALUES (:id, :name, :price, 'ACTIVE', SYSDATE)`,
                { id, name, price },
                { autoCommit: true } // AutoCommit is vital in 'Thin Mode' / Pools
            );
        } finally {
            // only close if we opened it ourselves. 
            // If Middleware gave it to us, Middleware will close it later.
            if (shouldClose) {
                await conn.close();
            }
        }
    }

    @tracer.captureMethod()
    async getById(id: string): Promise<Product | null> {
        const shouldClose = !this.db;
        const conn = this.db || await getOracleConnection();

        try {
            const result = await conn.execute<OracleProductRow>(
                `SELECT ID, NAME, PRICE, STATUS, UPDATED_AT 
                 FROM PRODUCTS WHERE ID = :id`,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT } 
            );
            
            const row = result.rows?.[0]; 
            
            if (!row) return null;

            // MAPPER: DB (Upper) -> App (Camel)
            return {
                id: row.ID,
                name: row.NAME,
                price: row.PRICE,
                status: row.STATUS as Product['status'], 
                updatedAt: row.UPDATED_AT
            };

        } finally {
            if (shouldClose) await conn.close();
        }
    }

    @tracer.captureMethod()
    async updatePrice(id: string, newPrice: number): Promise<void> {
        const shouldClose = !this.db;
        const conn = this.db || await getOracleConnection();

        try {
            await conn.execute(
                `UPDATE PRODUCTS 
                 SET PRICE = :price, UPDATED_AT = SYSDATE 
                 WHERE ID = :id`,
                { price: newPrice, id },
                { autoCommit: true }
            );
        } finally {
            if (shouldClose) await conn.close();
        }
    }

    @tracer.captureMethod()
    async softDelete(id: string): Promise<void> {
        const shouldClose = !this.db;
        const conn = this.db || await getOracleConnection();

        try {
            await conn.execute(
                `UPDATE PRODUCTS 
                 SET STATUS = 'INACTIVE', UPDATED_AT = SYSDATE 
                 WHERE ID = :id`,
                { id },
                { autoCommit: true }
            );
        } finally {
            if (shouldClose) await conn.close();
        }
    }
}