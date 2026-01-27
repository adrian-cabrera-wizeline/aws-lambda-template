import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { observabilityMiddleware } from '../../../common/middleware/observability';
import { oracleMiddleware } from '../../../common/middleware/db-middy';

import { tracer } from '../../../common/utils/observability-tools';
import { AuditRepository } from '../../../common/repositories/audit-repository';

// Domain Imports
import { ProductService } from './service';
import { ProductRepository } from './repository-oracle';
import { CreateProductSchema, UpdateProductSchema } from './schemas';
import { ERRORS } from './constants';

// INFRASTRUCTURE (Warm Start Optimization)

// Initialize these ONCE. They stay alive between requests.
const ddbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const auditRepo = new AuditRepository(ddbClient, process.env.AUDIT_TABLE_NAME || 'AuditTable');

// Service is cached so we don't re-instantiate logic on every call
let service: ProductService;

const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context) => {
    // Dependency Injection (Composition Root)
    if (!service) {
        // @ts-ignore: context.db is injected by oracleMiddleware
        const productRepo = new ProductRepository(context.db);
        service = new ProductService(productRepo, auditRepo);
    }

    const { httpMethod, body, queryStringParameters } = event;
    const user = event.requestContext.authorizer?.claims?.sub || 'anonymous';
    const id = queryStringParameters?.id;

    try {
        if (httpMethod === 'POST') {
            // Strict Validation (Zod)
            const input = CreateProductSchema.parse(body);
            const result = await service.createProduct(user, input);
            return { statusCode: 201, body: JSON.stringify(result) };
        }

        if (httpMethod === 'GET') {
            if (!id) throw new Error(ERRORS.MISSING_ID);
            const result = await service.getProduct(id);
            return { statusCode: 200, body: JSON.stringify(result) };
        }

        if (httpMethod === 'PUT') {
            if (!id) throw new Error(ERRORS.MISSING_ID);
            // Partial Update Validation
            const input = UpdateProductSchema.parse(body);
            const result = await service.updateProduct(user, id, input);
            return { statusCode: 200, body: JSON.stringify(result) };
        }

        if (httpMethod === 'DELETE') {
            if (!id) throw new Error(ERRORS.MISSING_ID);
            await service.deleteProduct(user, id);
            return { statusCode: 204, body: '' }; // 204 = No Content
        }

    } catch (e: any) {
        // Error Mapping: Translate Domain Errors to HTTP Status Codes
        if (e.message === ERRORS.PRODUCT_NOT_FOUND) {
            return { statusCode: 404, body: JSON.stringify({ message: e.message }) };
        }
        if (e.message === ERRORS.MISSING_ID || e.message === ERRORS.ALREADY_DELETED) {
            return { statusCode: 400, body: JSON.stringify({ message: e.message }) };
        }
        // If it's a Zod Error or unknown, throw it. 
        // httpErrorHandler will catch it and return 400 (Zod) or 500.
        throw e;
    }

    return { statusCode: 404, body: JSON.stringify({ message: 'Route Not Found' }) };
};


export const handler = middy(lambdaHandler)
    // Observability (Tracer, Metrics, Logger) - Array Spread
    .use(observabilityMiddleware()) 
    // Database Injection
    .use(oracleMiddleware())
    // Request Parsing
    .use(jsonBodyParser())
    // Error Handling (Last safety net)
    .use(httpErrorHandler());