import { DynamoDBClient, CreateTableCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ endpoint: "http://localhost:8000", region: "us-east-1", credentials: { accessKeyId: "x", secretAccessKey: "x" }});

const createTable = async (name: string) => {
  try {
    await client.send(new CreateTableCommand({
      TableName: name,
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }, { AttributeName: "sk", KeyType: "RANGE" }],
      AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }, { AttributeName: "sk", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST"
    }));
    console.log(`Created ${name}`);
  } catch (e: any) { if (e.name !== 'ResourceInUseException') console.error(e.message); }
};

const seed = async () => {
  await createTable("Audit_Logs_Local");
  await createTable("App_Configs_Local");

  await client.send(new PutItemCommand({
    TableName: "App_Configs_Local",
    Item: {
      pk: { S: "USER#550e8400-e29b-41d4-a716-446655440000" },
      sk: { S: "CONFIG" },
      theme: { S: "dark" }
    }
  }));
};

seed();