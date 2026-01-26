import { Connection } from 'oracledb';
import { OracleRepository } from './repository-oracle';
import { AuditRepository } from './repository-audit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../common/utils/observability-tools';
import { Product } from '../../../common/types';

export class ProductService {
    private oracle: OracleRepository;
    private audit: AuditRepository;

    /**
     * DEPENDENCY INJECTION
     * We allow the Handler to pass in the Shared DB Connection.
     */
    constructor(dbConnection?: Connection) {
        // 💡 LEARN: Pass the connection DOWN to the repository.
        // Now the repository will use this specific connection 
        // instead of opening a new one.
        this.oracle = new OracleRepository(dbConnection);

        // Audit usually writes to DynamoDB (HTTP), so it doesn't need Oracle connection
        this.audit = new AuditRepository();
    }
    /*
     * Journey: Insert into Oracle -> Log 'CREATE' in DynamoDB
    */
    async createProduct(name: string, price: number, userId: string) {
        const newId = uuidv4();

        logger.info("Service: Creating Product", { newId, name });

        // Write State (Uses Injected Connection)
        await this.oracle.create(newId, name, price);

        // Write Audit
        await this.audit.logChange(userId, 'CREATE', newId, { name, price });

        return { id: newId, status: 'created' };
    }
    /**
     * Journey: Fetch Old Price -> Update Oracle -> Log 'UPDATE' with Delta
    */
    async updatePrice(id: string, newPrice: number, userId: string) {
        // 1. Fetch Current (Uses Injected Connection)
        const current = await this.oracle.getById(id);

        if (!current) {
            logger.warn("Update failed: Product not found", { id });
            throw new Error("Product Not Found");
        }

        // 2. Perform Update (Uses SAME Connection)
        await this.oracle.updatePrice(id, newPrice);

        // 3. Log Delta
        await this.audit.logChange(userId, 'UPDATE', id, {
            field: 'price',
            oldPrice: current.price,
            newPrice: newPrice
        });

        return { id, status: 'updated' };
    }
    /**
     * Journey: Soft Delete in Oracle -> Log 'DEACTIVATE' in DynamoDB
     */
    async recallProduct(id: string, reason: string, userId: string) {
        const current = await this.oracle.getById(id);
        if (!current) throw new Error("Product Not Found");

        await this.oracle.softDelete(id);

        await this.audit.logChange(userId, 'DEACTIVATE', id, {
            reason: reason,
            previousStatus: current.status
        });

        return { id, status: 'inactive' };
    }
    /**
   * Journey: Read from Oracle
   */
    async getProduct(id: string): Promise<Product> {
        const p = await this.oracle.getById(id);
        if (!p) throw new Error("Product Not Found");
        return p;
    }
}