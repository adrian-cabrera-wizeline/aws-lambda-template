import { handler } from '../../src/handler';
import { ProductService } from '../../src/service';
import { ERRORS } from '../../src/constants';

// 1. Mock Dependencies
jest.mock('../../src/service');
jest.mock('../../src/repository-oracle');
jest.mock('../../../common/repositories/audit-repository');

// 2. Mock Middleware (So we don't need real DB/Observability in unit tests)
jest.mock('../../../common/middleware/observability', () => ({
    observabilityMiddleware: () => ({ before: jest.fn() }) 
}));
jest.mock('../../../common/middleware/db-middy', () => ({
    oracleMiddleware: () => ({ before: (req: any) => { req.context.db = {}; } })
}));

describe('Handler Routing', () => {
    let mockServiceInstance: any;

    beforeEach(() => {
        // Reset Service Mock
        mockServiceInstance = {
            createProduct: jest.fn(),
            getProduct: jest.fn(),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn()
        };
        (ProductService as jest.Mock).mockImplementation(() => mockServiceInstance);
    });

    const createEvent = (method: string, body: any = null, qs: any = null) => ({
        httpMethod: method,
        body: body, // Middy jsonBodyParser will have parsed this already
        queryStringParameters: qs,
        requestContext: { authorizer: { claims: { sub: 'user-123' } } }
    });

    it('POST /product -> 201 Created', async () => {
        mockServiceInstance.createProduct.mockResolvedValue({ id: 'new-id' });
        
        const event = createEvent('POST', { name: 'Valid', price: 10 });
        // @ts-ignore - Invoke handler directly
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body).id).toBe('new-id');
        expect(mockServiceInstance.createProduct).toHaveBeenCalled();
    });

    it('GET /product -> 200 OK', async () => {
        mockServiceInstance.getProduct.mockResolvedValue({ id: '123' });

        const event = createEvent('GET', null, { id: '123' });
        // @ts-ignore
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(200);
        expect(mockServiceInstance.getProduct).toHaveBeenCalledWith('123');
    });

    it('DELETE /product -> 204 No Content', async () => {
        mockServiceInstance.deleteProduct.mockResolvedValue();

        const event = createEvent('DELETE', null, { id: '123' });
        // @ts-ignore
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(204);
        expect(response.body).toBe('');
    });

    it('Should return 400 if ID is missing on GET', async () => {
        const event = createEvent('GET', null, {}); // No ID
        // @ts-ignore
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe(ERRORS.MISSING_ID);
    });

    it('Should return 404 if Service throws PRODUCT_NOT_FOUND', async () => {
        mockServiceInstance.getProduct.mockRejectedValue(new Error(ERRORS.PRODUCT_NOT_FOUND));

        const event = createEvent('GET', null, { id: '999' });
        // @ts-ignore
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(404);
    });
});