import { docClient } from '../../../common/utils/dynamodb-client';
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { logger } from '../../../common/utils/observability-tools';

export class AuditRepository {

    private tableName = process.env.AUDIT_TABLE || 'product-audit-trail';

    /**
     * Writes an immutable record to DynamoDB.
     * Includes TTL for automatic cleanup after 1 year.
     */
    async logChange(userId: string, action: string, entityId: string, snapshot: any) {
        // Log to CloudWatch for operational visibility
        logger.info(`📝 Audit Log Created`, { action, entityId, userId });
        
        try {
            await docClient.send(new PutCommand({
                TableName: this.tableName,
                Item: {
                    // Partition Key: Groups all logs for a specific product
                    PK: `PRODUCT#${entityId}`,
                    // Sort Key: Unique timestamp ensures history is ordered
                    SK: new Date().toISOString(),
                    Action: action,
                    UserId: userId,
                    Snapshot: snapshot, // The "Before/After" or "Payload" data
                    // TTL: Current Time + 1 Year (in seconds)
                    TTL: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) 
                }
            }));
        } catch (error) {
            // If Audit Fails, we should arguably fail the whole transaction
            // or alert heavily. For now, we log an error.
            logger.error('Failed to write Audit Log', { error: error as Error, entityId });
            throw error; // Re-throw to ensure the user knows something went wrong
        }
    }
}