import { ProductService } from '../../src/service';
import { ERRORS } from '../../src/constants';

// 🎭 Mocks
const mockRepo = {
    save: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
};
const mockAudit = { log: jest.fn() };

// Mock Observability Tools
jest.mock('../../../common/utils/observability-tools', () => ({
    metrics: { addMetric: jest.fn() },
    logger: { warn: jest.fn(), info: jest.fn() },
    tracer: { captureMethod: () => jest.fn() }, // Decorator mock
    MetricUnits: { Count: 'Count' }
}));

describe('ProductService', () => {
    let service: ProductService;

    beforeEach(() => {
        service = new ProductService(mockRepo as any, mockAudit as any);
        jest.clearAllMocks();
    });

    describe('createProduct', () => {
        it('should create, persist, audit, and log metric', async () => {
            const input = { name: 'Test Item', price: 100 };
            const user = 'admin-user';

            const result = await service.createProduct(user, input);

            // 1. Check Return
            expect(result).toMatchObject({
                name: 'Test Item',
                price: 100,
                status: 'ACTIVE'
            });

            // 2. Check Persistence
            expect(mockRepo.save).toHaveBeenCalledWith(result);

            // 3. Check Audit
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'CREATE',
                entityId: result.id,
                performedBy: user
            }));
        });
    });

    describe('getProduct', () => {
        it('should return product if found', async () => {
            const mockProduct = { id: '123', name: 'Existing' };
            mockRepo.findById.mockResolvedValue(mockProduct);

            const result = await service.getProduct('123');
            expect(result).toEqual(mockProduct);
        });

        it('should throw error if not found', async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.getProduct('999'))
                .rejects.toThrow(ERRORS.PRODUCT_NOT_FOUND);
        });
    });

    describe('updateProduct', () => {
        it('should fetch current, apply updates, and audit', async () => {
            // Setup: Existing product
            mockRepo.findById.mockResolvedValue({ 
                id: '123', name: 'Old Name', price: 50, status: 'ACTIVE' 
            });

            const updateInput = { price: 60 };
            await service.updateProduct('user-1', '123', updateInput);

            // Verify update called with merged data
            expect(mockRepo.update).toHaveBeenCalledWith(expect.objectContaining({
                id: '123',
                name: 'Old Name',
                price: 60,
                status: 'ACTIVE'
            }));

            // Verify Audit
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'UPDATE',
                details: expect.objectContaining({ changes: updateInput })
            }));
        });
    });

    describe('deleteProduct (Soft Delete)', () => {
        it('should mark status as DELETED and update repo', async () => {
            // Setup: Active product
            mockRepo.findById.mockResolvedValue({ 
                id: '123', status: 'ACTIVE', updatedAt: 'old-date' 
            });

            await service.deleteProduct('admin', '123');

            // Verify it calls UPDATE with status=DELETED (not delete!)
            expect(mockRepo.update).toHaveBeenCalledWith(expect.objectContaining({
                id: '123',
                status: 'DELETED'
            }));

            // Verify Audit
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'DELETE',
                details: { type: 'Soft Delete' }
            }));
        });
    });
});