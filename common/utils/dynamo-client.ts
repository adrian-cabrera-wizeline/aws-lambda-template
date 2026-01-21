import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: isLocal ? "http://host.docker.internal:8000" : undefined,
  credentials: isLocal ? { accessKeyId: 'x', secretAccessKey: 'x' } : undefined
});

export const docClient = DynamoDBDocumentClient.from(client);