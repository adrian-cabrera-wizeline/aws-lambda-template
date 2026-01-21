import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@common/utils/dynamo-client";
import { TABLE_NAMES } from "@common/constants"; // 👈 Shared Constant
import { AuditLogItem } from "@common/types";    // 👈 Shared Type

export class DynamoRepo {
  async logAudit(entry: AuditLogItem) {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.AUDIT_LOGS,
      Item: {
        pk: `USER#${entry.userId}`,
        sk: `AUDIT#${entry.timestamp}`,
        action: entry.action,
        resource: entry.resourceId,
        status: entry.status,
        ttl: Math.floor(Date.now() / 1000) + (90 * 86400)
      }
    }));
  }
}