import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';

// SHARED TOOLS
import { logger, metrics } from '../../../common/utils/observability-tools';
import { withObservability } from '../../../common/middleware/observability';

// LOCAL IMPORTS
import { ProductService } from './service';
import { 
    CreateProductSchema, 
    UpdatePriceSchema, 
    ProductIdParamSchema 
} from './dto';
import { MetricResolution, MetricUnits } from '@aws-lambda-powertools/metrics';

const service = new ProductService();

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
    //  SECURITY: In a real app, extract this from event.requestContext.authorizer
    const userId = "admin-user-001"; 
    
    // Add UserID to all logs for this request context
    logger.appendKeys({ userId });

    const method = event.httpMethod;
    

    //  POST /product (Create)

    if (method === 'POST') {
        // Zod Parse: Throws 400 if body is invalid
        const body = CreateProductSchema.parse(event.body);
        
        const result = await service.createProduct(body.name, body.price, userId);
        
        // Custom Metric
        metrics.addMetric('ProductCreated', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 201, body: JSON.stringify(result) };
    }


    // PUT /product (Update Price)

    if (method === 'PUT') {
        const body = UpdatePriceSchema.parse(event.body);
        
        const result = await service.updatePrice(body.id, body.price, userId);
        
        metrics.addMetric('PriceUpdates', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 200, body: JSON.stringify(result) };
    }


    // DELETE /product?id=... (Recall)

    if (method === 'DELETE') {
        // Validate Query Params
        const params = ProductIdParamSchema.parse(event.queryStringParameters);
        
        const result = await service.recallProduct(params.id, "Manual API Recall", userId);
        
        metrics.addMetric('ProductRecalls', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 200, body: JSON.stringify(result) };
    }


    // GET /product?id=... (Read)

    if (method === 'GET') {
        const params = ProductIdParamSchema.parse(event.queryStringParameters);
        try {
            const result = await service.getProduct(params.id);
            return { statusCode: 200, body: JSON.stringify(result) };
        } catch (error) {
            return { statusCode: 404, body: JSON.stringify({ message: "Product not found" }) };
        }
    }

    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
};

// ✨ THE MIDDLEWARE CHAIN
// 1. withObservability: Adds Logger, Tracer, Metrics
// 2. httpJsonBodyParser: Parses JSON string to Object
// 3. httpErrorHandler: Catches Zod errors (400) and Runtime errors (500)
export const handler = withObservability(
    middy(lambdaHandler)
        .use(httpJsonBodyParser())
        .use(httpErrorHandler())
);