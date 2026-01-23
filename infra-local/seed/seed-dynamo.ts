import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ endpoint: "http://localhost:8000", region: "us-east-1", credentials: { accessKeyId: "x", secretAccessKey: "x" }});

const seed = async () => {
  try {
    await client.send(new CreateTableCommand({
      TableName: "Audit_Logs_Local",
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }, { AttributeName: "sk", KeyType: "RANGE" }],
      AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }, { AttributeName: "sk", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST"
    }));
    console.log("✅ Tables Created");
  } catch (e: any) { if (e.name !== 'ResourceInUseException') console.error(e.message); }
};
seed();