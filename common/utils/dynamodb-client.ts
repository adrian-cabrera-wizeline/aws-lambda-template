import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { tracer } from './observability-tools';

const isOffline = process.env.IS_OFFLINE === 'true';

const config = isOffline 
    ? { 
        region: "localhost", 
        endpoint: "http://host.docker.internal:8000", 
        credentials: { accessKeyId: "mock", secretAccessKey: "mock" } 
      }
    : {}; 

const rawClient = new DynamoDBClient(config);

if (!isOffline) {
    tracer.captureAWSv3Client(rawClient);
}

export const docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true }
});