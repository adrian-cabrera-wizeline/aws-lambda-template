const esbuild = require('esbuild');
const glob = require('glob');

// Auto-discover all handlers
const entryPoints = glob.sync('functions/*/src/handler.ts');

esbuild.build({
  entryPoints,
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  outbase: '.', 
  external: ['@aws-sdk/*'], // Exclude AWS SDK (provided by Lambda Runtime)
}).catch(() => process.exit(1));