#!/usr/bin/env node

/**
 * 🔍 VERIFY DEPLOYMENT SCRIPT
 * ------------------------------------------------------------------
 * Acts as a "Circuit Breaker" in the CI/CD pipeline.
 * It polls the API Endpoint until it responds with 200 OK or times out.
 * * Usage:
 * export API_URL="https://api.dev.mysite.com"
 * export AUTH_TOKEN="optional-secret"
 * node common/scripts/verify-deployment.js
 */

const { strict: assert } = require('assert');

const CONFIG = {
  url: process.env.API_URL || 'http://127.0.0.1:3000/price', // Default to Local SAM
  testProductId: 'PROD-101', // Must exist in your Seed Data
  maxRetries: 10,
  retryDelayMs: 3000,
  timeoutMs: 5000,
};

// Helpers for colored output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smokeTest() {
  const targetUrl = `${CONFIG.url}?id=${CONFIG.testProductId}`;
  
  console.log(colors.blue(`\n🚀 Starting Smoke Test against: ${targetUrl}`));
  console.log(colors.blue(`------------------------------------------------`));

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      process.stdout.write(`Attempt ${attempt}/${CONFIG.maxRetries}: Pinging... `);

      // 1. Perform Request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if your API requires it
            // 'Authorization': process.env.AUTH_TOKEN 
        }
      });

      clearTimeout(timeout);

      // 2. Validate HTTP Status
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      // 3. Validate Payload Structure (Crucial!)
      const data = await response.json();
      
      // Check strict contract: Must contain price and currency
      assert.ok(data.price, 'Missing "price" field');
      assert.ok(data.currency, 'Missing "currency" field');
      assert.equal(data.productId, CONFIG.testProductId, 'Product ID mismatch');

      // ✅ SUCCESS
      console.log(colors.green('OK! ✅'));
      console.log(colors.green(`\n🎉 Deployment Verified Successfully!`));
      console.log(`   - Price: ${data.price} ${data.currency}`);
      console.log(`   - Latency: Low (implied)\n`);
      process.exit(0);

    } catch (error) {
      // FAIL (Temporary)
      console.log(colors.yellow(`FAILED ⚠️`));
      console.log(colors.yellow(`   Reason: ${error.message}`));

      if (attempt < CONFIG.maxRetries) {
        console.log(`   Retrying in ${CONFIG.retryDelayMs / 1000}s...`);
        await wait(CONFIG.retryDelayMs);
      } else {
        // FAIL (Permanent)
        console.error(colors.red(`\n💥 Smoke Test Failed after ${CONFIG.maxRetries} attempts.`));
        console.error(colors.red(`   Last Error: ${error.message}\n`));
        process.exit(1);
      }
    }
  }
}

// Run
smokeTest();