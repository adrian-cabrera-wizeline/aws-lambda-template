import { OracleRepository } from './repository-oracle';
import { AuditRepository } from './repository-audit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../common/utils/observability-tools';
import { Product } from '../../../common/types'; // Using Shared Types

export class ProductService {
    private oracle = new OracleRepository();
    private audit = new AuditRepository();

    /*
     * Journey: Insert into Oracle -> Log 'CREATE' in DynamoDB
     */
    async createProduct(name: string, price: number, userId: string) {
        const newId = uuidv4();
        
        logger.info("Service: Creating Product", { newId, name });

        // 1. Write State (Oracle)
        await this.oracle.create(newId, name, price);

        // 2. Write Audit (DynamoDB)
        await this.audit.logChange(userId, 'CREATE', newId, { 
            name, 
            price 
        });

        return { id: newId, status: 'created' };
    }

    /**
     * Journey: Fetch Old Price -> Update Oracle -> Log 'UPDATE' with Delta
     */
    async updatePrice(id: string, newPrice: number, userId: string) {
        // 1. Fetch Current State (Need this for the "Before" snapshot)
        const current = await this.oracle.getById(id);
        
        if (!current) {
            logger.warn("Update failed: Product not found", { id });
            throw new Error("Product Not Found"); // Handled by Middleware
        }

        // 2. Perform Update
        await this.oracle.updatePrice(id, newPrice);

        // 3. Log Delta (Audit)
        await this.audit.logChange(userId, 'UPDATE', id, { 
            field: 'price',
            oldPrice: current.price, 
            newPrice: newPrice 
        });

        logger.info("Service: Price Updated", { id, old: current.price, new: newPrice });
        return { id, status: 'updated' };
    }

    /**
     * (Soft Delete)
     * Journey: Soft Delete in Oracle -> Log 'DEACTIVATE' in DynamoDB
     */
    async recallProduct(id: string, reason: string, userId: string) {
        // 1. Verify existence
        const current = await this.oracle.getById(id);
        if (!current) throw new Error("Product Not Found");

        // 2. Soft Delete
        await this.oracle.softDelete(id);

        // 3. Log Reason
        await this.audit.logChange(userId, 'DEACTIVATE', id, { 
            reason: reason,
            previousStatus: current.status 
        });

        logger.info("Service: Product Recalled", { id, reason });
        return { id, status: 'inactive' };
    }
    
    /**
     * GET PRODUCT
     * Journey: Read from Oracle
     */
    async getProduct(id: string): Promise<Product> {
        const p = await this.oracle.getById(id);
        
        if (!p) {
            // Throwing standard errors allows http-error-handler to return 400/500
            // You can use http-errors library for specific 404s if preferred
            throw new Error("Product Not Found");
        }
        
        return p;
    }
}