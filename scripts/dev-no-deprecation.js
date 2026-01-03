#!/usr/bin/env node

/**
 * Development server script that suppresses punycode deprecation warnings
 * 
 * Usage: 
 *   node scripts/dev-no-deprecation.js
 * 
 * Or add to package.json as an optional script:
 *   "dev:clean": "node scripts/dev-no-deprecation.js"
 * 
 * This script suppresses only deprecation warnings while keeping
 * all other warnings and errors visible.
 */

const { spawn } = require('child_process');

// Set NODE_OPTIONS to suppress deprecation warnings
const env = {
  ...process.env,
  NODE_OPTIONS: (process.env.NODE_OPTIONS || '') + ' --no-deprecation'
};

// Start Next.js dev server with suppressed deprecation warnings
const child = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
  env: env
});

child.on('error', (error) => {
  console.error('Error starting dev server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

