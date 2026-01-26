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

    // --- 1. CREATE ---
    @tracer.captureMethod()
    async createProduct(user: string, input: CreateProductInput): Promise<Product> {
        // 1. Logic
        const product = createProduct(input);

        // 2. Persist
        await this.productRepo.save(product);

        // 3. Audit
        await this.auditRepo.log({
            entityId: product.id,
            action: 'CREATE',
            performedBy: user,
            timestamp: product.createdAt,
            details: { name: product.name, price: product.price }
        });

        // 4. Metrics
        metrics.addMetric('ProductCreated', MetricUnits.Count, 1);
        
        return product;
    }

    // --- 2. READ ---
    @tracer.captureMethod()
    async getProduct(id: string): Promise<Product> {
        const product = await this.productRepo.findById(id);
        
        if (!product) {
            logger.warn('Product not found during fetch', { id });
            throw new Error(ERRORS.PRODUCT_NOT_FOUND);
        }

        return product;
    }

    // --- 3. UPDATE ---
    @tracer.captureMethod()
    async updateProduct(user: string, id: string, input: UpdateProductInput): Promise<Product> {
        // Fetch current state
        const current = await this.getProduct(id);

        // Apply Pure Logic (Checks business rules like "Is it deleted?")
        const updated = updateProduct(current, input);

        // Persist
        await this.productRepo.update(updated);

        // Audit
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

    // --- 4. DELETE (Soft) ---
    @tracer.captureMethod()
    async deleteProduct(user: string, id: string): Promise<void> {
        const current = await this.getProduct(id);

        // Apply Soft Delete Logic
        const deleted = markAsDeleted(current);

        // Update the record status
        await this.productRepo.update(deleted);

        // Audit
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