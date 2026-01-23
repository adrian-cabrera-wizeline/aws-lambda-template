import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logger } from '@common/middleware/logger';
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@common/utils/dynamo-client";

const lambdaHandler = async (event: any) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) return { statusCode: 400, body: "Missing userId" };

  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_CONFIG || 'App_Configs_Local',
    Key: { pk: `USER#${userId}`, sk: 'CONFIG' }
  }));

  return { statusCode: 200, body: JSON.stringify(result.Item || {}) };
};

export const handler = middy(lambdaHandler).use(injectLambdaContext(logger));