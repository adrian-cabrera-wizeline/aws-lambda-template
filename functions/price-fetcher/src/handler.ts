import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';

import { logger, metrics } from '../../../common/utils/observability-tools';
import { withObservability } from '../../../common/middleware/observability';
import { oracleMiddleware } from '../../../common/middleware/db-middy';

import { ProductService } from './service';
import { 
    CreateProductSchema, 
    UpdatePriceSchema, 
    ProductIdParamSchema 
} from './dto';
import { MetricResolution, MetricUnits } from '@aws-lambda-powertools/metrics';
import { Context } from 'aws-lambda/handler';

const getUserId = (event: APIGatewayProxyEvent): string => {
    const auth = event.requestContext?.authorizer;
    // Cognito (Standard)
    if (auth?.claims?.sub) return auth.claims.sub;
    // Custom Authorizer
    if (auth?.principalId) return auth.principalId;
    // Local Fallback (Optional, but helps prevent crashes during dev)
    // You can remove this if you want to enforce auth strictly.
    return "anonymous-dev-user";
};


const lambdaHandler = async (event: APIGatewayProxyEvent,context:Context) => {
    const userId = getUserId(event);
    const service = new ProductService(context.db);
    // Add UserID to all logs for this request context
    logger.appendKeys({ userId });
    const method = event.httpMethod;

    // /product (Create)
    if (method === 'POST') {
        // Zod Parse: Throws 400 if body is invalid
        const body = CreateProductSchema.parse(event.body);
        const result = await service.createProduct(body.name, body.price, userId);
        // Custom Metric
        metrics.addMetric('ProductCreated', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 201, body: JSON.stringify(result) };
    }

    // /product (Update Price)
    if (method === 'PUT') {
        const body = UpdatePriceSchema.parse(event.body); 
        const result = await service.updatePrice(body.id, body.price, userId);
        metrics.addMetric('PriceUpdates', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 200, body: JSON.stringify(result) };
    }

    // /product?id=... (Recall)
    if (method === 'DELETE') {
        // Validate Query Params
        const params = ProductIdParamSchema.parse(event.queryStringParameters);
        const result = await service.recallProduct(params.id, "Manual API Recall", userId);
        metrics.addMetric('ProductRecalls', MetricUnits.Count, MetricResolution.High);
        
        return { statusCode: 200, body: JSON.stringify(result) };
    }

    // /product?id=... (Read)
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

// THE MIDDLEWARE CHAIN
// 1. withObservability: Adds Logger, Tracer, Metrics
// 2. httpJsonBodyParser: Parses JSON string to Object
// 3. httpErrorHandler: Catches Zod errors (400) and Runtime errors (500)
export const handler = withObservability(
    middy(lambdaHandler)
        .use(oracleMiddleware())
        .use(httpJsonBodyParser())
        .use(httpErrorHandler())
);