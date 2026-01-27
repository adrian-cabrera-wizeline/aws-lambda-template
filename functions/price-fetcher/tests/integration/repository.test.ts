import { ProductRepository } from '../../src/repository-oracle';

jest.mock('../../../../common/utils/observability-tools', () => ({
    tracer: { captureMethod: () => jest.fn() },
    logger: { info: jest.fn() }
}));

describe('ProductRepository (Oracle)', () => {
    let repo: ProductRepository;
    let mockDb: any;

    beforeEach(() => {
        mockDb = { execute: jest.fn() };
        repo = new ProductRepository(mockDb);
    });

    it('findById: should filter out DELETED items', async () => {
        mockDb.execute.mockResolvedValue({ rows: [{ id: '123', name: 'Test' }] });

        await repo.findById('123');

        // Verify SQL contains the soft-delete check
        const sql = mockDb.execute.mock.calls[0][0];
        expect(sql).toContain("status != 'DELETED'");
        expect(mockDb.execute).toHaveBeenCalledWith(
            expect.stringContaining('SELECT * FROM products'), 
            { id: '123' }
        );
    });

    it('save: should insert correct columns', async () => {
        const product: any = { 
            id: '1', name: 'P1', price: 10, status: 'ACTIVE', 
            createdAt: 'now', updatedAt: 'now' 
        };

        await repo.save(product);

        const sql = mockDb.execute.mock.calls[0][0];
        expect(sql).toContain('INSERT INTO products');
        expect(mockDb.execute).toHaveBeenCalledWith(expect.any(String), product);
    });

    it('update: should update fields including status', async () => {
        const product: any = { 
            id: '1', name: 'P1 Updated', price: 20, 
            status: 'ACTIVE', updatedAt: 'new-time' 
        };

        await repo.update(product);

        const sql = mockDb.execute.mock.calls[0][0];
        expect(sql).toContain('UPDATE products SET');
        expect(sql).toContain('status = :status');
    });
});