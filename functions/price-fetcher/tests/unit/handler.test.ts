import { handler } from '../../src/handler';
import { ProductService } from '../../src/service';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
// Import types/enums we need to verify/mock
import { MetricUnit } from '../../../../common/utils/observability-tools'; 

// --------------------------------------------------------
// 🎭 1. MOCK OBSERVABILITY TOOLS (With Enum Support)
// --------------------------------------------------------
jest.mock('../../../../common/utils/observability-tools', () => {
    // Attempt to keep original Enums, but provide fallbacks if they fail to load
    const original = jest.requireActual('../../../../common/utils/observability-tools');
    
    return {
        ...original,
        // 🟢 FIX: Explicitly define MetricUnit to prevent "undefined" crashes
        MetricUnit: original.MetricUnit || { Count: 'Count', Seconds: 'Seconds' },
        logger: { 
            appendKeys: jest.fn(), 
            info: jest.fn(), 
            error: jest.fn(),
            warn: jest.fn()
        },
        metrics: { 
            addMetric: jest.fn(), 
        },
        tracer: { 
            captureMethod: jest.fn(),
            captureAWSv3Client: jest.fn((c) => c), // Returns the client
            putAnnotation: jest.fn()
        }
    };
});

// --------------------------------------------------------
// 🎭 2. MOCK MIDDLEWARE (With Body Parsing)
// --------------------------------------------------------
jest.mock('../../../../common/middleware/observability', () => ({
    // 🟢 FIX: Simulate json-body-parser. 
    // Since we bypass the real middleware, we must ensure 'event.body' is an Object
    // before it reaches the handler, or the handler will crash trying to read it.
    withObservability: (handlerFn: any) => async (event: any, context: any) => {
        if (event.body && typeof event.body === 'string') {
            try {
                event.body = JSON.parse(event.body);
            } catch (e) {
                // Keep as string if parse fails (Middy behavior)
            }
        }
        return handlerFn(event, context);
    }
}));

jest.mock('../../../../common/middleware/db-middy', () => ({
    oracleMiddleware: () => ({
        before: async (request: any) => {
            request.context.db = {
                execute: jest.fn(),
                close: jest.fn()
            };
        }
    })
}));

jest.mock('../../src/service');

// --------------------------------------------------------
// 🛠️ HELPER: Create Event
// --------------------------------------------------------
const TEST_UUID = "550e8400-e29b-41d4-a716-446655440000";

const createEvent = (
    method: string, 
    body: any = null, 
    queryParams: any = null
): APIGatewayProxyEvent => {
    return {
        httpMethod: method,
        // Send STRING (simulating API Gateway)
        body: body ? JSON.stringify(body) : null,
        queryStringParameters: queryParams,
        pathParameters: {}, 
        headers: { 
            'Content-Type': 'application/json' 
        },
        requestContext: {
            authorizer: {
                claims: { sub: 'test-user-123' }
            }
        }
    } as unknown as APIGatewayProxyEvent;
};

const mockContext = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test-fn',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123:function:test-fn',
    awsRequestId: 'test-req-id'
} as Context;

describe('Lambda Handler (HTTP Layer)', () => {
    const MockService = ProductService as jest.MockedClass<typeof ProductService>;
    
    beforeEach(() => {
        jest.clearAllMocks();
        MockService.prototype.createProduct = jest.fn();
        MockService.prototype.getProduct = jest.fn();
    });

    test('POST /product - Valid Input - Should return 201', async () => {
        (MockService.prototype.createProduct as jest.Mock).mockResolvedValue({ 
            id: TEST_UUID, 
            status: 'created' 
        });

        const event = createEvent('POST', { name: 'Valid Product', price: 100 });
        const response = await handler(event, mockContext);

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body)).toEqual({ id: TEST_UUID, status: 'created' });
    });

    test('POST /product - Invalid Input (Zod) - Should return 400', async () => {
        const event = createEvent('POST', { name: 'Bad Product', price: -10 });
        const response = await handler(event, mockContext);

        expect(response.statusCode).toBe(400); 
    });

    test('GET /product - Found - Should return 200', async () => {
        const mockProduct = { id: TEST_UUID, name: 'Test', price: 50, status: 'ACTIVE' };
        (MockService.prototype.getProduct as jest.Mock).mockResolvedValue(mockProduct);

        const event = createEvent('GET', null, { id: TEST_UUID });
        const response = await handler(event, mockContext);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(mockProduct);
    });

    test('GET /product - Not Found - Should return 404', async () => {
        (MockService.prototype.getProduct as jest.Mock).mockRejectedValue(new Error("Product Not Found"));

        const event = createEvent('GET', null, { id: TEST_UUID });
        const response = await handler(event, mockContext);

        expect(response.statusCode).toBe(404);
    });
});