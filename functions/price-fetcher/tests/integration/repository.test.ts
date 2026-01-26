import { OracleRepository } from '../../src/repository-oracle';
import { getOracleConnection } from '../../../../common/utils/oracle-client';
import { v4 as uuidv4 } from 'uuid';

describe('OracleRepository Integration', () => {
    // We use a real connection logic here
    const repo = new OracleRepository(); 

    // Helper data
    const testId = uuidv4();
    const testName = 'Integration Test Product';
    const testPrice = 150.00;

    //CLEANUP: Close pool after all tests are done
    afterAll(async () => {
        const conn = await getOracleConnection();
        await conn.close(); 
    });

    test('Full Lifecycle: Create -> Read -> Update -> Soft Delete', async () => {

        await repo.create(testId, testName, testPrice);
        // 2. READ & VERIFY
        const product = await repo.getById(testId);
        expect(product).not.toBeNull();
        expect(product?.name).toBe(testName);
        expect(product?.status).toBe('ACTIVE');

        await repo.updatePrice(testId, 199.99);
        const updatedProduct = await repo.getById(testId);
        expect(updatedProduct?.price).toBe(199.99);

        await repo.softDelete(testId);
        const deletedProduct = await repo.getById(testId);
        expect(deletedProduct?.status).toBe('INACTIVE');
    });
});