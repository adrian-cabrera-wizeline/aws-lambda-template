import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@common/utils/dynamo-client";
import { TABLE_NAMES } from "@common/constants";
import { AuditLogItem } from "@common/types";
export class DynamoRepo {
  async logAudit(item: AuditLogItem) {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.AUDIT_LOGS,
      Item: {
        pk: `USER#${item.userId}`,
        sk: `AUDIT#${item.timestamp}`,
        action: item.action,
        resource: item.resourceId,
        status: item.status,
        ttl: Math.floor(Date.now() / 1000) + (90 * 86400) // 90 days
      }
    }));
  }
}