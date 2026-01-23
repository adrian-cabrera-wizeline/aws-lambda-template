import middy from '@middy/core';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { oracleMiddleware } from '@common/middleware/db-middy';
import { logger, tracer } from '@common/middleware/logger';
import { ERROR_CODES } from '@common/constants';

import { PriceRequestSchema } from './dto';
import { OracleRepo } from './repositoryOracle';
import { DynamoRepo } from './repositoryDynamo';
import { processRequest } from './service';

const lambdaHandler = async (event: any, context: any) => {
  // Health Check for CI/CD
  if (event.health_check) return { statusCode: 200, body: "OK" };

  const validation = PriceRequestSchema.safeParse(event);
  if (!validation.success) {
    logger.warn("Validation Failed", { issues: validation.error.issues });
    return {
      statusCode: 400,
      body: JSON.stringify({ code: ERROR_CODES.VALIDATION_ERROR, details: validation.error.issues })
    };
  }

  const { id, userId } = validation.data.queryStringParameters;

  // Logic Execution
  const oracle = new OracleRepo(context.db); // Injected by middleware
  const dynamo = new DynamoRepo();
  const result = await processRequest(oracle, dynamo, id, userId);

  if (!result) return { statusCode: 404, body: JSON.stringify({ code: ERROR_CODES.NOT_FOUND }) };

  return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(httpHeaderNormalizer())
  .use(oracleMiddleware());