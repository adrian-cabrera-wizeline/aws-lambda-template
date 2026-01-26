import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/observability-tools';

export interface AuditEntry {
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    performedBy: string;
    timestamp: string;
    details: Record<string, any>;
    ttl?: number; // Optional override, otherwise defaults to 90 days,for compliance (auto-delete old logs) and robust error handling.
}

export class AuditRepository {
    private docClient: DynamoDBDocumentClient;
    private tableName: string;

    constructor(client: DynamoDBClient, tableName: string) {
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = tableName;
    }

    async log(entry: AuditEntry): Promise<void> {
        // Default TTL: 90 days from now (Compliance Standard)
        const defaultTTL = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60);
        
        logger.debug('Writing audit log', { entityId: entry.entityId, action: entry.action });

        try {
            await this.docClient.send(new PutCommand({
                TableName: this.tableName,
                Item: {
                    PK: `AUDIT#${entry.entityId}`,
                    SK: entry.timestamp,
                    ...entry,
                    // Ensure every record has an expiration
                    ttl: entry.ttl || defaultTTL
                }
            }));
        } catch (error) {
            // Security Best Practice: "Fail Open" or "Fail Closed"?
            // For Audits, we typically don't want to crash the user's transaction if the audit DB is down,
            // BUT we must alert an Admin immediately.
            logger.error('CRITICAL: Failed to write audit log', { error, entry });
            
            // Note: If strict compliance is required (e.g. Banking), you might want to throw here.
            // throw new Error("Audit Failure"); 
        }
    }
}