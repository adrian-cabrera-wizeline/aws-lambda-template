# 📘 Developer Handbook: Cloud Backend Monorepo

### What does this App do?

**Business Goal:**
This application is a **High-Compliance Pricing Microservice**.
It allows authorized systems (like a Web Frontend or Mobile App) to look up the current price of a product. However, because this is likely for a regulated industry (like Finance or Healthcare), it must strictly **Audit** every single lookup to answer the question: *"Who looked at this price, and when?"*

## 📦 Services & Functions

| Function Name | Brief Explanation |
| :--- | :--- |
| [**Price Fetcher**](./functions/price-fetcher/README.md) | Handles Product CRUD operations (Create, Read, Update, Delete) using a Dual-Write architecture (Oracle + DynamoDB). Includes [Event Testing Guide](./infra-local/events/price-fetcher/README.md). |
| [**Config Service**](./functions/config-service/README.md) | Handles unity configs. |


### 🧩 Why this Architecture?

1. **Why Oracle?**
* **Reason:** "Relational Truth." Pricing data is often complex, relational, and requires strict consistency (ACID) found in SQL databases.


2. **Why DynamoDB?**
* **Reason:** "High-Volume Write." Audit logs can be massive. If 1 million users check prices, Oracle might choke on the inserts. DynamoDB handles massive write throughput easily and we can set a **TTL (Time-to-Live)** to auto-delete logs after 90 days to save money.


3. **Why Lambda?**
* **Reason:** "Bursty Traffic." Pricing checks happen sporadically. Lambda scales to 0 when no one is checking (saving money) and scales to 1,000s when a sale happens.

### 📂 Project Directory Structure

```text
lambda-monorepo/
├── 📁 .github/
│   └── workflows/
│       └── main.yml               # CI/CD Pipeline
│
├── 📁 common/                     # 🧠 SHARED KERNEL (The "Glue")
│   ├── 📁 middleware/             # Reusable logic (Error Handler, CORS)
│   ├── 📁 repositories/           # Shared Data Access (e.g., AuditRepository)
│   ├── 📁 utils/                  # Loggers, DB Clients (Oracle/Dynamo)
│   ├── 📁 tests/                  # Integration tests for shared code
│   └── jest.config.js             # Common-specific test config
│
├── 📁 functions/                  # ⚡ MICROSERVICES (Source Code)
│   └── 📁 price-fetcher/          # Feature: Dual-Write Product Service
│       ├── 📁 src/
│       │   ├── handler.ts         # Controller (Validation & HTTP Adapter)
│       │   ├── service.ts         # Business Logic (Dual-Write Orchestration)
│       │   ├── repository.ts      # Oracle SQL Logic
│       │   ├── models.ts          # Zod Schemas & Types specific to this Lambda
│       │   └── constants.ts       # Error codes & static values for this Lambda
│       ├── 📁 tests/              # Unit & Integration Tests
│       ├── jest.config.js         # Function-specific test config
│       ├── tsconfig.json          # TypeScript config (extends root, excludes tests)
│       └── README.md              # Service Documentation
│
├── 📁 infra-local/                # 🏗️ LOCAL SIMULATION (Docker & SAM)
│   ├── 📁 events/                 # 🧪 JSON Payloads for 'sam local invoke'
│   │   └── 📁 price-fetcher/      # Events specific to Price Fetcher
│   │       ├── create.json
│   │       └── read.json
│   ├── 📁 seed/                   # SQL/TS scripts to populate local DBs
│   ├── docker-compose.yml         # Defines Oracle & DynamoDB containers
│   └── local-debug.yaml           # SAM Template for Local API Emulation
│
├── 📁 scripts/                    # 🛠️ DEVELOPER TOOLS
│   ├── test-runner.mjs            # 🐢 Interactive CLI for running tests
│   ├── test-live-crud.sh          # 🐇 Bash script for End-to-End API testing
│   └── verify-deployment.ts       # 🕵️ Post-deploy script to health-check the env
│
├── .gitignore
├── esbuild.config.js              # Bundler config (Optimizes TS -> JS)
├── jest.config.js                 # 🎼 Root Test Orchestrator
├── jest.config.base.js            # 📝 Shared Test "Recipe" (Presets, Paths)
├── package.json                   # Scripts (npm run local:api, db:start)
└── tsconfig.json                  # Root TypeScript compiler rules

```

---

### 📋 Folders & Files Responsibilities

| Folder/File | Responsibility | Use Case |
| --- | --- | --- |
| **`common/middleware/`** | Contains reusable Middy middleware for cross-cutting concerns (Error Handling, CORS, Headers). | "I want every Lambda to automatically catch errors and return a standardized 500 JSON response." |
| **`common/repositories/`** | Shared Data Access Layers (DAL) that can be used by multiple services (e.g., Audit Logging). | "I need to write to the global `AuditTable` from both the Price Fetcher and Config Service." |
| **`functions/price-fetcher/src/models.ts`** | Defines the data shape and validation (Zod) specific to this microservice. | "I need to define that a 'Product' must have a positive price, but this rule only applies to the Price Fetcher." |
| **`functions/price-fetcher/src/constants.ts`** | Stores magic strings, error messages, and configuration keys specific to this microservice. | "I need to store the specific SQL query strings or error codes for the Price Fetcher." |
| **`functions/price-fetcher/tsconfig.json`** | Defines how TypeScript compiles this specific Lambda. Extends the root config but isolates this folder. | "I want to ensure this Lambda compiles with strict settings without trying to compile the entire repo." |
| **`infra-local/events/`** | Stores JSON payloads that mimic AWS events (like API Gateway requests). Organized by function. | "I want to debug the `createProduct` handler using `sam local invoke` without running the HTTP server." |
| **`scripts/verify-deployment.ts`** | A script used in CI/CD (or locally) to verify that the deployed service is responding correctly. | "The pipeline just finished deploying. I need to run a quick health check to ensure the URL is live and returning 200 OK." |
| **`scripts/test-live-crud.sh`** | A Bash script that performs an End-to-End "Smoke Test" against the running local API. | "I want to verify that Create, Read, Update, and Delete actually work on the live server." |
| **`local-debug.yaml`** | The SAM Template used *only* for local development. It points to `dist/` and Docker networks. | "I need to map the URL `/product` to my Lambda function on my local machine." |
| **`jest.config.base.js`** | The "Master Recipe" for testing. Defines shared settings like TS transformation and path aliases. | "I want to ensure all projects use the same TypeScript compiler settings for tests." |

---
## [CI/CD workflow ](pipeline-workflow) diagrams and strategies
---

## 🛠 Development Environment Setup For An Specific Lambda

### Prerequisites
Before starting, ensure your local machine has the following installed:

* **Node.js v18+** (v20 recommended)
* **Docker Desktop** (Must be running to simulate databases)
* **AWS SAM CLI** ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html))
* **AWS CLI** (Configured with any dummy credentials for local use)


## 🚀 Development Workflow

To develop and debug your Lambda functions locally without touching AWS, we will use a combination of **Docker** (to simulate the database layer) and **AWS SAM CLI** (to simulate the Lambda runtime).

Here is the step-by-step workflow.

### The Local Architecture

We replicate the cloud environment on your laptop.

* **Lambda:** Simulated by AWS SAM (Serverless Application Model).
* **Oracle:** Simulated by the `gvenzl/oracle-xe` Docker container.
* **DynamoDB:** Simulated by the `amazon/dynamodb-local` Docker container.
* **Network:** SAM containers and Database containers communicate via a bridge network (`host.docker.internal`).

### Workflow Steps 
#### Summary of Commands

| Goal | Command |
| --- | --- |
| **Start DBs** | `npm run dev:env` |
| **Test "Lambda Service Name"** | `npm run invoke:lambda-name:event-action` |
| **Run Unit Tests** | `npm test` |
| **Stop Everything** | `npm run db:stop` |

#### Step 1: Start the Infrastructure
Open a terminal in your project root to install the compiler, build tools, and shared libraries.

```bash
npm install
```

Run the custom script defined in your `package.json`.

```bash
# Start the containers and seed the data automatically
npm run dev:env
```

**What happens?**

1. `docker-compose up` starts the Oracle and DynamoDB containers.
2. The script waits 10 seconds (giving Oracle time to boot).
3. It runs `seed-dynamo.ts` to create the "Audit_Logs_Local" table.
4. Oracle initializes automatically using the SQL file mounted in `docker-compose.yml`.

#### Step 2: Run a Request (The "Invoke")

To test your code, you don't need to deploy. You just "invoke" it against the local infrastructure.

```bash
#in this case we are testing the price-fetcher function
npm run invoke:price:read
```

**What happens?**

1. **Build:** Runs `esbuild` to compile your TypeScript into `dist/`.
2. **SAM Invoke:**
* Reads `infra-local/local-debug.yaml`.
* Spins up a temporary Docker container mimicking the AWS Lambda environment.
* Mounts the compiled code.
* Injects the environment variables (`ORACLE_HOST=host.docker.internal`).
* Sends the JSON payload from `infra-local/events/price-event.json`.


3. **Result:** You see the JSON response in your terminal.

```json
//this is just a dummy value
{"statusCode":200,"body":"{\"productId\":\"PROD-101\",\"price\":99.99,\"currency\":\"USD\"}"}

```

### The "Build-Invoke" Cycle

Because AWS Lambda runs JavaScript, you must compile your TypeScript before testing.

1. **Modify code** in `functions/`.
2. **Build & Invoke:** `npm run invoke:price:action` (bundles files into the `/dist` folder & runs the function locally via SAM).

### Database Seeding

* **Oracle:** Automatically seeds via `infra-local/seed/01_oracle_init.sql` when the container first starts.
* **DynamoDB:** Seeds via `npm run db:seed`. This script creates the tables and inserts mock JSON items.

### Testing

* **Unit Tests:** Run `npm test` to execute Jest. These tests use mocks, so no Docker is required.
* **Integration Tests:** Use `npm run invoke:<service_name>` to test the full flow from Handler → Service → Docker DB.

---
## 🛰️ API Gateway Simulation & Local Testing

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
npm run invoke:price:read
```


### Step-by-Step: Debugging (Breakpoints) 🐞

Console logs are fine, but sometimes you need to inspect variables line-by-line.

#### Configure VS Code

Create/Update the `.vscode/launch.json` file(already have an example in this repo). This tells VS Code how to attach to the SAM debugger.

#### Run the Debug Session

1. **Terminal:** Run the invoke command with the debug flag (`-d`).
```bash
# This compiles the code and waits on port 5858
npm run build && cd infra-local && sam local invoke -t local-debug.yaml -e events/price-event.json -d 5858 PriceFetcherLocal
```

*Output:* `Debugger listening on ws://0.0.0.0:5858/...`

**VS Code:**
* Open `functions/price-fetcher/src/service.ts`.
* Click the **Red Dot** in the margin to set a breakpoint.
* Go to the **Run and Debug** tab (Play icon with a bug).
* Select **"Attach to SAM Local"** and press Play.


**Result:**
* The terminal will resume execution.
* VS Code will **freeze** at your breakpoint.
* You can hover over variables like `productId` or `oracle` to see their values locally!

#### Troubleshooting Local Issues

| Issue | Likely Cause | Solution |
| --- | --- | --- |
| **"Connection Refused"** | Lambda container cannot see `localhost`. | Ensure `local-debug.yaml` uses `host.docker.internal` for DB hosts. |
| **"Table Not Found"** | DynamoDB Local is in-memory only. | If you restarted the container, run `npm run db:seed` to recreate tables. |
| **"Handler Not Found"** | You didn't compile the latest code. | Always run `npm run build` before invoking SAM. |
| **"Process exited with code 1"** | TypeScript compilation error. | Check your terminal for `esbuild` errors (missing types, syntax errors). |

---

## 🔑 Environment Variables & Secret Management

This project uses environment variables to switch between local and cloud resources.

| Variable | Source (Local) | Source (Cloud/Terraform) | Purpose |
| --- | --- | --- | --- |
| `AWS_SAM_LOCAL` | Set to `true` in SAM | Not set | Used by `common/utils` to point to Docker. |
| `ORACLE_HOST` | `host.docker.internal` | RDS/OCI Private IP | The address of the Oracle DB. |
| `TABLE_AUDIT` | `Audit_Logs_Local` | Terraform Output | The DynamoDB table name for audit trails. |
| `ORACLE_USER` | `app_user` | AWS Secrets Manager | Database credentials. |

> **Note:** In the local environment, these variables are managed inside `infra-local/local-debug.yaml`. In Production, the SRE team injects these via Terraform into the Lambda configuration.

---

## 👮 Security & Compliance Rules

To maintain **HIPAA/FDA** compliance, every developer must follow these rules:

1. **No Plain SQL:** Never use string concatenation for queries. Always use **Bind Variables** in the repository layer.
2. **Validation:** Every request must be validated by **Zod** in the `handler` or `schema` file.
3. **Audit Logs:** Every "Read" from Oracle must trigger a corresponding "Audit Write" to DynamoDB.
4. **Logging:** Never log PII (Personal Identifiable Information). Use the `logger` utility to ensure logs are structured but clean.

---

## 📈 Monitoring, Compliance & FinOps

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