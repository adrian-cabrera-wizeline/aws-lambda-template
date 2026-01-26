const baseConfig = require('../jest.config.base.js'); // Assuming this exists at root

module.exports = {
  ...baseConfig,
  displayName: 'COMMON',
  rootDir: '.',
  // 🟢 Allow tests inside 'repositories', 'utils', etc.
  roots: ['<rootDir>/repositories', '<rootDir>/utils', '<rootDir>/middleware', '<rootDir>/tests'],
  testMatch: [
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  }
};