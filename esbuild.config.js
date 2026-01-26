const esbuild = require('esbuild');
const glob = require('glob');

// Auto-discovery: Find all handlers (e.g., functions/price-fetcher/src/handler.ts)
const entryPoints = glob.sync('functions/*/src/handler.ts');

esbuild.build({
  entryPoints,
  keepNames:true, // CRITICAL: Keeps "OracleRepository" instead of "a" in X-Ray
  bundle: true,
  minify: true,
  sourcemap: true, // Important for debugging (X-Ray/CloudWatch)
  platform: 'node',
  target: 'node20',
  outdir: 'dist',// Output to dist/
  outbase: '.',  // Maintain folder structure (dist/functions/price-fetcher/src/...)
  external: ['@aws-sdk/*'], // Don't bundle AWS SDK (it is already in the Lambda Runtime)
  logLevel: 'info'
}).catch(() => process.exit(1));