import { Product } from './schemas';
import { tracer, logger } from '../../../common/utils/observability-tools';

export class ProductRepository {
    constructor(private dbConnection: any) {}

    @tracer.captureMethod()
    async save(product: Product): Promise<void> {
        await this.dbConnection.execute(
            'INSERT INTO products (id, name, price, status, created_at, updated_at) VALUES (:id, :name, :price, :status, :createdAt, :updatedAt)',
            product
        );
    }

    @tracer.captureMethod()
    async findById(id: string): Promise<Product | null> {
        // JOURNEY: User wants to check a price.
        // We must ONLY return non-deleted items.
        const result = await this.dbConnection.execute(
            "SELECT * FROM products WHERE id = :id AND status != 'DELETED'", 
            { id }
        );
        return result.rows?.[0] || null;
    }

    @tracer.captureMethod()
    async update(product: Product): Promise<void> {
        await this.dbConnection.execute(
            'UPDATE products SET name = :name, price = :price, status = :status, updated_at = :updatedAt WHERE id = :id',
            {
                id: product.id, 
                name: product.name, 
                price: product.price, 
                status: product.status, 
                updatedAt: product.updatedAt 
            }
        );
    }

    @tracer.captureMethod()
    async softDelete(id: string): Promise<void> {
        logger.info('Soft deleting product', { id });
        await this.dbConnection.execute(
            "UPDATE products SET status = 'DELETED', updated_at = :now WHERE id = :id",
            { id, now: new Date().toISOString() }
        );
    }
}