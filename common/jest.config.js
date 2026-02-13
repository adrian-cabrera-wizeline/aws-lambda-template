const baseConfig = require('../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'COMMON',
  rootDir: '.', // Sets root to /common
  
  // 🟢 OVERRIDE: Map @common/ imports to the current directory
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/$1' 
  },

  // 🟢 OVERRIDE: Only look for tests inside common
  roots: [
    '<rootDir>/repositories', 
    '<rootDir>/utils', 
    '<rootDir>/middleware', 
    '<rootDir>/tests'
  ],

  // 🟢 CONFIG: Use the local tsconfig
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }]
  }
};