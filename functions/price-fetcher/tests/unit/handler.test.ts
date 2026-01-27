import { ERRORS } from '../../src/constants';

// Static Mocks (Keep these at the top)
jest.mock('../../src/service');
jest.mock('../../src/repository-oracle');
jest.mock('../../../../common/repositories/audit-repository');

jest.mock('../../../../common/middleware/observability', () => ({
    observabilityMiddleware: () => ({ before: jest.fn() }) 
}));
jest.mock('../../../../common/middleware/db-middy', () => ({
    oracleMiddleware: () => ({ before: (req: any) => { req.context.db = {}; } })
}));

describe('Handler Routing', () => {
    let handler: any;
    let mockServiceInstance: any;

    beforeEach(async () => {
        //  Reset Modules: Clear cache so handler and service are re-loaded
        jest.resetModules();

        // Setup the Mock Instance for THIS test
        mockServiceInstance = {
            createProduct: jest.fn(),
            getProduct: jest.fn(),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn()
        };

        // DYNAMICALLY Import the Service Mock
        // We must get the *fresh* mock constructor that Jest just created after resetModules()
        const { ProductService } = await import('../../src/service');
        
        // Configure the Fresh Mock
        (ProductService as jest.Mock).mockImplementation(() => mockServiceInstance);

        // DYNAMICALLY Import the Handler
        // This triggers the "Cold Start" again, using the configured ProductService above
        const module = await import('../../src/handler');
        handler = module.handler;
    });

    const createEvent = (method: string, body: any = null, qs: any = null) => ({
        httpMethod: method,
        body: body, 
        queryStringParameters: qs,
        requestContext: { authorizer: { claims: { sub: 'user-123' } } }
    });

    it('POST /product -> 201 Created', async () => {
        mockServiceInstance.createProduct.mockResolvedValue({ id: 'new-id' });
        
        const event = createEvent('POST', { name: 'Valid', price: 10 });
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body).id).toBe('new-id');
        expect(mockServiceInstance.createProduct).toHaveBeenCalled();
    });

    it('GET /product -> 200 OK', async () => {
        mockServiceInstance.getProduct.mockResolvedValue({ id: '123' });

        const event = createEvent('GET', null, { id: '123' });
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(200);
        expect(mockServiceInstance.getProduct).toHaveBeenCalledWith('123');
    });

    it('DELETE /product -> 204 No Content', async () => {
        mockServiceInstance.deleteProduct.mockResolvedValue();

        const event = createEvent('DELETE', null, { id: '123' });
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(204);
    });

    it('Should return 400 if ID is missing on GET', async () => {
        const event = createEvent('GET', null, {});
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe(ERRORS.MISSING_ID);
    });

    it('Should return 404 if Service throws PRODUCT_NOT_FOUND', async () => {
        mockServiceInstance.getProduct.mockRejectedValue(new Error(ERRORS.PRODUCT_NOT_FOUND));

        const event = createEvent('GET', null, { id: '999' });
        const response = await handler(event, {} as any);

        expect(response.statusCode).toBe(404);
    });
});