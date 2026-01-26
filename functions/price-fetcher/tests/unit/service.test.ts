import { ProductService } from '../../src/service';
import { OracleRepository } from '../../src/repository-oracle';
import { AuditRepository } from '../../src/repository-audit';

jest.mock('../../src/repository-oracle');
jest.mock('../../src/repository-audit');

describe('ProductService Unit Tests', () => {
    let service: ProductService;
    
    // Get access to the Mock functions so we can spy on them
    const MockOracleRepo = OracleRepository as jest.MockedClass<typeof OracleRepository>;
    const MockAuditRepo = AuditRepository as jest.MockedClass<typeof AuditRepository>;

    beforeEach(() => {
        // Clear previous call history
        MockOracleRepo.mockClear();
        MockAuditRepo.mockClear();
        // Initialize service (it will use the Mocks internally)
        service = new ProductService();
    });

    test('createProduct: should save to Oracle and Audit log', async () => {
        const result = await service.createProduct('Gaming Mouse', 99.99, 'user-123');
        // Did we get an ID back?
        expect(result.id).toBeDefined();
        expect(result.status).toBe('created');

        const oracleInstance = MockOracleRepo.mock.instances[0];
        expect(oracleInstance.create).toHaveBeenCalledWith(
            expect.any(String), // UUID
            'Gaming Mouse',
            99.99
        );

        const auditInstance = MockAuditRepo.mock.instances[0];
        expect(auditInstance.logChange).toHaveBeenCalledWith(
            'user-123',
            'CREATE',
            expect.any(String),
            expect.objectContaining({ name: 'Gaming Mouse' })
        );
    });

    test('updatePrice: should throw error if product does not exist', async () => {
        // Simulate "Product Not Found" in DB
        const oracleInstance = MockOracleRepo.mock.instances[0];
        // Force getById to return null
        (oracleInstance.getById as jest.Mock).mockResolvedValue(null); 

        await expect(
            service.updatePrice('fake-id', 50.00, 'user-123')
        ).rejects.toThrow('Product Not Found');
        
        // Ensure we NEVER tried to update the price
        expect(oracleInstance.updatePrice).not.toHaveBeenCalled();
    });
});