import { AuditRepository } from '../../repositories/audit-repository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// SETUP: Connect to Localstack or Real AWS
// (Ensure your terminal has AWS credentials or AWS_REGION set)
const TABLE_NAME = process.env.AUDIT_TABLE_NAME || 'AuditTable';
const client = new DynamoDBClient({
    // If testing locally with LocalStack or normal image:
    // endpoint: 'http://localhost:4566',
    // region: 'us-east-1'
});
const docClient = DynamoDBDocumentClient.from(client);

describe('AuditRepository (Integration)', () => {
    // Only run integration tests if explicitly requested
    // (Prevents CI from failing if no DB is present)
    const runIntegration = process.env.TEST_TYPE === 'integration' ? describe : describe.skip;

    runIntegration('DynamoDB Write', () => {
        const repo = new AuditRepository(client, TABLE_NAME);

        test('Should persist data to real DynamoDB', async () => {
            const timestamp = new Date().toISOString();
            const id = `test-integration-${Date.now()}`;

            // Write
            await repo.log({
                entityId: id,
                action: 'UPDATE',
                performedBy: 'integration-test',
                timestamp: timestamp,
                details: { test: true }
            });

            // Read Back (Verification)
            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `AUDIT#${id}`,
                    SK: timestamp
                }
            }));

            expect(result.Item).toBeDefined();
            expect(result.Item?.action).toBe('UPDATE');
            expect(result.Item?.performedBy).toBe('integration-test');
        });
    });
});