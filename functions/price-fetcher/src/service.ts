import { ProductRepository } from './repository-oracle';
import { AuditRepository } from '../../../common/repositories/audit-repository';
import { CreateProductInput, UpdateProductInput, Product } from './schemas';
import { createProduct, updateProduct, markAsDeleted } from './product.domain';
import { logger, metrics, MetricUnits, tracer } from '../../../common/utils/observability-tools';
import { ERRORS } from './constants';

export class ProductService {
    constructor(
        private productRepo: ProductRepository,
        private auditRepo: AuditRepository
    ) {}

    @tracer.captureMethod()
    async createProduct(user: string, input: CreateProductInput): Promise<Product> {
        const product = createProduct(input);

        await this.productRepo.save(product);

        await this.auditRepo.log({
            entityId: product.id,
            action: 'CREATE',
            performedBy: user,
            timestamp: product.createdAt,
            details: { name: product.name, price: product.price }
        });

        metrics.addMetric('ProductCreated', MetricUnits.Count, 1);
        
        return product;
    }

    @tracer.captureMethod()
    async getProduct(id: string): Promise<Product> {
        const product = await this.productRepo.findById(id);
        
        if (!product) {
            logger.warn('Product not found during fetch', { id });
            throw new Error(ERRORS.PRODUCT_NOT_FOUND);
        }

        return product;
    }

    @tracer.captureMethod()
    async updateProduct(user: string, id: string, input: UpdateProductInput): Promise<Product> {
        // Fetch current state
        const current = await this.getProduct(id);
        // Apply Pure Logic (Checks business rules like "Is it deleted?")
        const updated = updateProduct(current, input);

        await this.productRepo.update(updated);

        await this.auditRepo.log({
            entityId: id,
            action: 'UPDATE',
            performedBy: user,
            timestamp: updated.updatedAt,
            details: { changes: input, oldPrice: current.price }
        });

        metrics.addMetric('ProductUpdated', MetricUnits.Count, 1);
        
        return updated;
    }

    // --- DELETE (Soft) ---
    @tracer.captureMethod()
    async deleteProduct(user: string, id: string): Promise<void> {
        const current = await this.getProduct(id);
        
        const deleted = markAsDeleted(current);

        await this.productRepo.update(deleted);

        await this.auditRepo.log({
            entityId: id,
            action: 'DELETE',
            performedBy: user,
            timestamp: deleted.updatedAt,
            details: { type: 'Soft Delete' }
        });

        metrics.addMetric('ProductDeleted', MetricUnits.Count, 1);
    }
}