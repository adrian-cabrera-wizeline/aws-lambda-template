const fs = require('fs');
const path = require('path');

console.log("🚀 Initializing Cloud Backend Monorepo...");

// Define all files (folders will be created automatically)
const filesToCreate = [
  // Root Configs
  '.gitignore',
  '.gitlab-ci.yml',
  'esbuild.config.js',
  'jest.config.js',
  'package.json',
  'tsconfig.json',
  'README.md',

  // VS Code
  '.vscode/launch.json',

  // Common (Shared Core)
  'common/constants/error-codes.ts',
  'common/middleware/logger.ts',
  'common/middleware/db-middy.ts',
  'common/types/index.ts',
  'common/utils/oracle-client.ts',
  'common/utils/dynamo-client.ts',

  // Function: Price Fetcher
  'functions/price-fetcher/src/handler.ts',
  'functions/price-fetcher/src/service.ts',
  'functions/price-fetcher/src/repository.ts',
  'functions/price-fetcher/tests/handler.test.ts',
  'functions/price-fetcher/tests/service.test.ts',
  'functions/price-fetcher/package.json',

  // Function: Config Service
  'functions/config-service/src/handler.ts',
  'functions/config-service/src/service.ts',
  'functions/config-service/tests/handler.test.ts',

  // Placeholders
  'functions/auth-handler/src/index.ts',
  'functions/rule-engine/src/index.ts',

  // Local Infra & Seed
  'infra-local/local-debug.yaml',
  'infra-local/docker-compose.yml',
  'infra-local/events/price-event.json',
  'infra-local/events/config-event.json',
  'infra-local/seed/01_oracle_init.sql',
  'infra-local/seed/seed-dynamo.ts'
];

filesToCreate.forEach((filePath) => {
  // Normalize path for Windows/Linux
  const absolutePath = path.resolve(filePath);
  const dirName = path.dirname(absolutePath);

  // 1. Create Directory recursively
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
    console.log(`  📂 Created Dir:  ${path.dirname(filePath)}`);
  }

  // 2. Create Empty File
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, '');
    console.log(`  📄 Created File: ${filePath}`);
  }
});

console.log("\n✅ Folder structure created successfully!");