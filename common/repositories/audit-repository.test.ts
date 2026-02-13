import { AuditRepository } from './audit-repository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/observability-tools';

// We keep PutCommand REAL so 'command.input' exists. 
jest.mock('@aws-sdk/lib-dynamodb', () => {
    const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
    return {
        ...actual,
        DynamoDBDocumentClient: {
            from: jest.fn(), // We hijack this
        },
    };
});

jest.mock('../utils/observability-tools', () => ({
    logger: { debug: jest.fn(), error: jest.fn() }
}));

describe('AuditRepository (Unit)', () => {
    let repo: AuditRepository;
    let mockSend: jest.Mock;

    beforeEach(() => {
        const mockClient = new DynamoDBClient({});
        
        mockSend = jest.fn();

        // Configure the mocked .from() to return our mock client
        (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({ 
            send: mockSend 
        });

        repo = new AuditRepository(mockClient, 'TestAuditTable');
        jest.clearAllMocks();
    });

    test('Should write audit log with correct PK, SK and TTL', async () => {
        const entry = {
            entityId: 'product-123',
            action: 'CREATE' as const,
            performedBy: 'admin-user',
            timestamp: '2023-01-01T12:00:00Z',
            details: { name: 'Test' }
        };

        await repo.log(entry);

        expect(mockSend).toHaveBeenCalledTimes(1);
        
        // VERIFICATION:
        // Because PutCommand is now real, 'command.input' is populated correctly.
        const command = mockSend.mock.calls[0][0] as PutCommand;
        
        expect(command.input.TableName).toBe('TestAuditTable');
        expect(command.input.Item).toEqual(expect.objectContaining({
            PK: 'AUDIT#product-123',
            SK: '2023-01-01T12:00:00Z',
            action: 'CREATE',
            ttl: expect.any(Number) // Ensure TTL was calculated and added
        }));
    });

    test('Should catch errors and log critical alert without crashing', async () => {
        mockSend.mockRejectedValue(new Error('DynamoDB Throttling'));

        const entry = {
            entityId: 'product-123',
            action: 'DELETE' as const,
            performedBy: 'user',
            timestamp: '2023-01-01T12:00:00Z',
            details: {}
        };

        // Should NOT throw
        await expect(repo.log(entry)).resolves.not.toThrow();

        // Should Log Error
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('CRITICAL'), 
            expect.objectContaining({ error: expect.any(Error) })
        );
    });
});