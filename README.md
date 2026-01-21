# 📘 Developer Handbook: Cloud Backend Monorepo

This repository is a production-grade TypeScript monorepo for AWS Lambda services. It follows a **Shared Core** architecture to ensure that security, database connectivity, and observability (HIPAA/FDA compliant) are consistent across all services.

## 📂 Project Directory Structure

```text
/dev-application-monorepo
├── 📁 common/                 # SHARED CORE: Logic used by all services
│   ├── 📁 middleware/         #   - Onion layers: withDbConnection, Logger, Zod validation
│   ├── 📁 utils/              #   - Global clients: Oracle Pool, DynamoDB Client
│   ├── 📁 types/              #   - Shared TypeScript interfaces and contracts
│   └── 📁 constants/          #   - Application-wide error codes and enums
├── 📁 functions/              # MICROSERVICES: Independent business units
│   ├── 📁 price-fetcher/      #   - Service: Oracle Integration & Audit Logging
│   │   ├── 📁 src/            #       - Core source code
│   │   │   ├── handler.ts     #       - Entry point (HTTP Parsing & Validation)
│   │   │   ├── service.ts     #       - Pure business logic
│   │   │   ├── repository-oracle.ts # - Oracle SQL queries
│   │   │   ├── repository-dynamo.ts # - DynamoDB Audit logging
│   │   │   └── schema.ts      #       - Zod Request/Response validation
│   │   └── 📁 tests/          #       - Jest unit and integration tests
│   └── 📁 config-service/     #   - Service: User Configuration Management
├── 📁 infra-local/            # LOCAL SIMULATION HARNESS
│   ├── 📁 events/             #   - Mock API Gateway JSON payloads
│   ├── 📁 seed/               #   - Database initialization scripts (SQL & TS)
│   ├── local-debug.yaml       #   - AWS SAM template for local Lambda simulation
│   └── docker-compose.yml     #   - Container config for Oracle & DynamoDB
├── esbuild.config.js          # Build system configuration
├── package.json               # Root dependencies and workflow scripts
└── tsconfig.json              # Global TypeScript configuration

```
---

## 🛠 1. Development Environment Setup

### Prerequisites

Before starting, ensure your local machine has the following installed:

* **Node.js v18+** (v20 recommended)
* **Docker Desktop** (Must be running to simulate databases)
* **AWS SAM CLI** ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html))
* **AWS CLI** (Configured with any dummy credentials for local use)

### Step 1: Install Dependencies

Run this at the root of the project to install the compiler, build tools, and shared libraries.

```bash
npm install

```

### Step 2: Spin Up Local Infrastructure

This project uses Docker to simulate the cloud environment (Oracle and DynamoDB).

```bash
# Start the containers and seed the data automatically
npm run dev:env

```

---

## 📂 2. Folder & File Responsibilities

| Folder / File | Responsibility | Use Case |
| --- | --- | --- |
| `common/` | **Global Logic** | Code that *every* Lambda needs (Logger, DB Clients, Auth). |
| `common/middleware/` | **Cross-cutting Concerns** | Middy wrappers for DB injection, Zod validation, and Error handling. |
| `common/utils/` | **Resource Clients** | Singleton instances of Oracle and DynamoDB SDKs. |
| `functions/` | **Service Domain** | Independent business logic units (e.g., Price Fetcher, Config). |
| `functions/X/src/` | **Source Code** | Contains the `handler` (entry), `service` (logic), and `repository` (DB). |
| `functions/X/tests/` | **Unit Testing** | Jest files for testing logic without calling real databases. |
| `infra-local/` | **Local Simulation** | Configuration for Docker and AWS SAM local execution. |
| `infra-local/seed/` | **Data Provisioning** | SQL and TS scripts that populate your local DBs on startup. |
| `esbuild.config.js` | **Build System** | Bundles TypeScript into production-ready JavaScript. |

---

## 🚀 3. Development Workflow

### A. The "Build-Invoke" Cycle

Because AWS Lambda runs JavaScript, you must compile your TypeScript before testing.

1. **Modify code** in `functions/`.
2. **Build:** `npm run build` (bundles files into the `/dist` folder).
3. **Test:** `npm run test` (executes Jest unit tests with mocks)
4. **Invoke:** `npm run invoke:price` (runs the function locally via SAM).

### B. Database Seeding

* **Oracle:** Automatically seeds via `infra-local/seed/01_oracle_init.sql` when the container first starts.
* **DynamoDB:** Seeds via `npm run db:seed`. This script creates the tables and inserts mock JSON items.

### C. Testing

* **Unit Tests:** Run `npm test` to execute Jest. These tests use mocks, so no Docker is required.
* **Integration Tests:** Use `npm run invoke:<service_name>` to test the full flow from Handler → Service → Docker DB.

---

## 🪲 4. Debugging in VS Code

You can set breakpoints in your TypeScript code and step through a local Lambda execution.

1. **Start SAM in Debug Mode:**
```bash
sam local invoke -t infra-local/local-debug.yaml -d 5858 <FunctionName>

```


2. **Attach VS Code:**
* Open the "Run and Debug" tab.
* Select the **"Attach to SAM Local"** configuration.
* Press **F5**.


3. **Execution:** The terminal will wait until the debugger is attached, then trigger your breakpoint.

---

## 🔑 5. Environment Variables & Secret Management

This project uses environment variables to switch between local and cloud resources.

| Variable | Source (Local) | Source (Cloud/Terraform) | Purpose |
| --- | --- | --- | --- |
| `AWS_SAM_LOCAL` | Set to `true` in SAM | Not set | Used by `common/utils` to point to Docker. |
| `ORACLE_HOST` | `host.docker.internal` | RDS/OCI Private IP | The address of the Oracle DB. |
| `TABLE_AUDIT` | `Audit_Logs_Local` | Terraform Output | The DynamoDB table name for audit trails. |
| `ORACLE_USER` | `app_user` | AWS Secrets Manager | Database credentials. |

> **Note:** In the local environment, these variables are managed inside `infra-local/local-debug.yaml`. In Production, the SRE team injects these via Terraform into the Lambda configuration.

---

## 👮 6. Security & Compliance Rules

To maintain **HIPAA/FDA** compliance, every developer must follow these rules:

1. **No Plain SQL:** Never use string concatenation for queries. Always use **Bind Variables** in the repository layer.
2. **Validation:** Every request must be validated by **Zod** in the `handler` or `schema` file.
3. **Audit Logs:** Every "Read" from Oracle must trigger a corresponding "Audit Write" to DynamoDB.
4. **Logging:** Never log PII (Personal Identifiable Information). Use the `logger` utility to ensure logs are structured but clean.

---

## 🛰️ 7. API Gateway Simulation & Local Testing

Because your Lambdas are designed to sit behind an AWS API Gateway, they expect a specific JSON "Proxy Event" structure (containing headers, query parameters, and a stringified body). You cannot simply run the code with `node index.js`.

### A. Testing via Event Injection (Recommended for CI/CD & Fast Iteration)

This method injects a "frozen" JSON event directly into your Lambda. It is the fastest way to test specific scenarios (e.g., a missing User ID).

**1. The Event File:**
In `infra-local/events/price-event.json`, we store a mock API Gateway request:

```json
{
  "httpMethod": "GET",
  "queryStringParameters": {
    "id": "PROD-101",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "requestContext": {
    "requestId": "local-test-id"
  }
}

```

**2. The Execution:**

```bash
# This uses SAM to "wrap" your code in the official Lambda Docker image 
# and feeds it the JSON event above.
npm run invoke:price

```

---

### B. Testing via Local API Server (Recommended for Frontend Integration)

If you want to test your Lambda using **Postman** or a **Browser**, you can tell SAM to host a local HTTP server that behaves exactly like API Gateway.

**1. Start the Local Server:**

```bash
cd infra-local
sam local start-api -t local-debug.yaml --warm-containers EAGER

```

**2. Send a Request:**
The server will start on `http://127.0.0.1:3000`. You can now use Postman to hit your endpoints:

* **GET** `http://127.0.0.1:3000/price?id=PROD-101&userId=xxx`

---

### C. Generating New Mock Events

We use JSON files in `infra-local/events/` to simulate HTTP requests.

* **Location:** `infra-local/events/price-event.json`
* **Usage:** SAM reads this file and "injects" it into your handler as the `event` object.

If you create a new Lambda (e.g., a POST request for Salesforce), you can generate a valid API Gateway mock event using the SAM CLI:

```bash
# Generates a boilerplate API Gateway Proxy event
sam local generate-event apigateway aws-proxy > infra-local/events/new-service-event.json

```
---

## 🪲 8. Debugging Workflows

### 1. The "Pause and Attach" Method

If you need to inspect variables during an API Gateway simulation:

1. **Run with Debug Flag:**
```bash
sam local invoke -t infra-local/local-debug.yaml -e infra-local/events/price-event.json -d 5858 PriceFetcherLocal

```

2. **Attach VS Code:** Open VS Code, press `F5` (ensure the `.vscode/launch.json` has an "Attach to SAM Local" configuration). The execution will pause at your breakpoint.

### 2. Viewing Structured Logs

Since we use **AWS Lambda Powertools**, your local terminal will output logs in JSON format.

* **Tip:** Install the **"JSON Crack"** or **"Pretty Logs"** extension in your terminal to view these easily. These logs will look identical to what you will see in **CloudWatch Insights** in Production.

---

### Updated `.vscode/launch.json`

Add this to your `.vscode/launch.json` so the "Attach" feature works:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to SAM Local",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "${workspaceFolder}/functions/price-fetcher",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false
    }
  ]
}

```
---

## 📈 9. Monitoring, Compliance & FinOps

We adhere to the **AWS Well-Architected Serverless Lens**. Our strategy prioritizes **Compliance** (Security & Auditability) while leveraging **FinOps** (Cost Awareness) to minimize the Total Cost of Ownership (TCO).

### A. The Observability Stack

We use a **Serverless-Native** stack to avoid managing monitoring infrastructure.

| Component | Tool | Purpose | FinOps Strategy |
| --- | --- | --- | --- |
| **Logs** | **CloudWatch Logs** | Application errors, debugging info. | Retention policies prevent "Zombie Data" costs. |
| **Metrics** | **CloudWatch EMF** | Business KPIs (e.g., "Price Fetched"). | Uses Embedded Metric Format (EMF) to avoid API costs. |
| **Tracing** | **AWS X-Ray** | Performance bottlenecks & Latency. | Enabled only in Prod with 5% sampling. |
| **Audit** | **DynamoDB** | Immutable record of *who* accessed *what*. | TTL (Time-To-Live) automatically deletes old records. |

### B. HIPAA/FDA Compliance Strategy

To meet regulatory standards, we enforce the following strictly in the code (`common/middleware/logger.ts`) and infrastructure:

1. **No PII in Logs:** The logger is configured to never output sensitive fields (like `ssn`, `patient_name`, or raw `auth_tokens`). We log *Process IDs* (e.g., `request_id`), not *Personal Data*.
2. **Immutable Audit Trail:** While CloudWatch tracks *debug* info, **DynamoDB** tracks *access* info.
* *Rule:* Every "Read" from Oracle triggers a "Write" to the Audit Table.
* *Compliance:* This table allows us to answer: *"Who accessed Patient X's data on Date Y?"*

3. **Data Retention:**
* **Dev Logs:** 7 Days (Aggressive cleanup to save space).
* **Prod Audit Logs:** 6 Years (or strict regulatory requirement), managed via DynamoDB TTL and S3 Archiving.

### C. FinOps Principles (Why not Prometheus?)

You might ask: *"Why not use Prometheus/Grafana?"*

1. **Zero Idle Cost:** CloudWatch costs (0.00) when traffic is zero. Managed Prometheus has a base cost (~$100/mo) regardless of traffic. For our current scale (<100 Lambdas), CloudWatch is significantly cheaper.
2. **Cost Controls in Code:**
* **EMF (Embedded Metric Format):** We do not make `PutMetricData` API calls (which cost money). We print metrics to standard logs, and AWS extracts them for free.
* **Sampling:** X-Ray tracing is expensive at 100%. We configure it to sample only **5% of traffic** in Production, giving us statistical significance at 1/20th of the cost.

---