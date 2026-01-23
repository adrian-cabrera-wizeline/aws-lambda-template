import { getOracleConnection } from '../../../common/utils/oracle-client';
import oracledb from 'oracledb';
import { tracer } from '../../../common/utils/observability-tools';
import { Product, OracleProductRow } from '../../../common/types'; // 👈 Shared Kernel Imports

export class OracleRepository {
    
    /**
     * 🟢 CREATE
     * Inserts a new product. Status defaults to 'ACTIVE'.
     */
    @tracer.captureMethod() // Auto-instrumentation for X-Ray
    async create(id: string, name: string, price: number): Promise<void> {
        const conn = await getOracleConnection();
        try {
            await conn.execute(
                `INSERT INTO PRODUCTS (ID, NAME, PRICE, STATUS, UPDATED_AT) 
                 VALUES (:id, :name, :price, 'ACTIVE', SYSDATE)`,
                { id, name, price },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * 🔵 READ (Get By ID)
     * Maps raw Oracle rows (UPPERCASE) to Domain Object (camelCase).
     */
    @tracer.captureMethod()
    async getById(id: string): Promise<Product | null> {
        const conn = await getOracleConnection();
        try {
            // We expect a row matching the OracleProductRow interface
            const result = await conn.execute<OracleProductRow>(
                `SELECT ID, NAME, PRICE, STATUS, UPDATED_AT 
                 FROM PRODUCTS WHERE ID = :id`,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT } // Returns { ID: '...', NAME: '...' }
            );
            
            const row = result.rows?.[0]; // Safe access
            
            if (!row) return null;

            // 🔄 THE MAPPER
            // Decouples App Logic from DB Column Names
            return {
                id: row.ID,
                name: row.NAME,
                price: row.PRICE,
                // Cast string to specific Union Type ('ACTIVE' | 'INACTIVE')
                status: row.STATUS as Product['status'], 
                updatedAt: row.UPDATED_AT
            };

        } finally {
            await conn.close();
        }
    }

    /**
     * 🟠 UPDATE (Price Only)
     * Updates price and refreshes the UPDATED_AT timestamp.
     */
    @tracer.captureMethod()
    async updatePrice(id: string, newPrice: number): Promise<void> {
        const conn = await getOracleConnection();
        try {
            await conn.execute(
                `UPDATE PRODUCTS 
                 SET PRICE = :price, UPDATED_AT = SYSDATE 
                 WHERE ID = :id`,
                { price: newPrice, id },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * 🔴 DELETE (Soft Delete)
     * We NEVER delete data. We set status to INACTIVE.
     */
    @tracer.captureMethod()
    async softDelete(id: string): Promise<void> {
        const conn = await getOracleConnection();
        try {
            await conn.execute(
                `UPDATE PRODUCTS 
                 SET STATUS = 'INACTIVE', UPDATED_AT = SYSDATE 
                 WHERE ID = :id`,
                { id },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }
}