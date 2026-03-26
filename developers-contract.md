# 📘 Serverless Monorepo: CI/CD Architecture & Developer Guide

Welcome to the Serverless Monorepo Deployment Guide. 

This repository utilizes an **Immutable Delivery Pipeline**. To ensure zero-downtime deployments, strict compliance, and isolated blast radiuses, the SRE team has completely automated the release process.

As a developer, you do not need to write AWS CLI commands, manage Terraform, or configure GitLab YAML pipelines. You only need to adhere to the **Developer Contract**.

---

## 🤝 1. The Developer Contract

To add a new Lambda or update an existing one, you must fulfill three simple structural requirements. 

**Rule 1: Folder Structure**
Your code must live inside its own isolated folder within the `functions/` directory.

```text
functions/
├── configurations-lambda/    <-- Your isolated microservice
│   ├── package.json
│   ├── verify-deployment.ts
│   └── src/
```

**Rule 2: The NPM Scripts**
Your `package.json` must contain exactly two scripts for the CI/CD pipeline to execute:
1. `"build"`: Compiles your TypeScript/code into the `dist/` directory.
2. `"test:smoke"`: Runs your automated brake script.

**Rule 3: The Automated Brake (Smoke Test)**
You must include a `verify-deployment.ts` script. When your code deploys to DEV, the pipeline will dynamically fetch your API Gateway URL and pass it to this script as `process.env.SMOKE_TEST_URL`. Your script must ping this URL. 
* If it returns HTTP 200 -> The pipeline turns green and alerts QA.
* If it fails -> The pipeline halts immediately, preventing broken code from reaching UAT.

---

## 🗓️ 2. The Day-to-Day Workflow

Forget manual tagging and version numbers. The pipeline handles all of it automatically through the **Master Lifecycle**.

### Step 1: Write Code & Merge
1. Create a feature branch (e.g., `feat/add-dynamo-index`).
2. Write your code inside your specific function folder (e.g., `functions/configurations-lambda`).
3. Open a Pull Request and merge it into the `main` branch. 
* **Your job is now done.**

### Step 2: The SRE Bot Auto-Tagger (Pipeline A)
The moment you merge to `main`, a hidden SRE Bot wakes up. 
* It checks the last release version.
* It automatically bumps the version number and attaches your commit SHA (e.g., `v1.0.6-c9f1a88`).
* It pushes this new tag to the repository.

### Step 3: The Dynamic Router (Pipeline B)
When the new tag is pushed, the actual deployment pipeline triggers. 
* **Blast Radius Containment:** The CI engine scans the Git history. If you only modified `configurations-lambda`, it will *only* deploy `configurations-lambda`. It completely ignores the other 19 microservices in the monorepo to save time and reduce risk.

### Step 4: The Factory (DEV)
* The pipeline builds your code.
* It zips the artifact and locks it inside the **Immutable S3 Vault**.
* It deploys the code to the **DEV Environment**.
* It runs your `npm run test:smoke` script.

### Step 5: QA & Production Promotions
Because the artifact is immutable, we never rebuild the code for higher environments. We tag the Artifact, not the Environment.
* **UAT:** The pipeline pauses. The QA Lead must click "Approve" in GitLab. The system then pulls your exact `v1.0.6-c9f1a88` zip file from the S3 Vault and deploys it to UAT.
* **PROD:** The pipeline pauses again. Management clicks "Approve". The system deploys that exact same zip file to Production.

---

## ➕ 3. How to Add a Brand New Microservice

Adding a 21st Lambda to this repository takes less than a minute. You **do not** need to edit `.gitlab-ci.yml`. 

1. Create a new folder in `functions/` (e.g., `functions/report-generator-lambda`).
2. Add your code, your `package.json`, and your `verify-deployment.ts`.
3. Merge to `main`. 

The Dynamic Router will automatically detect the new folder, generate the CI/CD deployment jobs for DEV, UAT, and PROD, and route it to the SRE Engine automatically.

## 🔗 4. Shared Utilities (The `shared-utils` folder)

If you have code that multiple Lambdas use (like database connection wrappers or logging formats), put it in the root `shared-utils/` directory. 

If you modify a file inside `shared-utils/` and merge to `main`, the Dynamic Router is smart enough to detect the change and will automatically trigger the deployment pipeline for **all** Lambdas that depend on it to ensure they are using the latest shared logic.

---
*Maintained by the Platform Engineering (SRE) Team.*

---

