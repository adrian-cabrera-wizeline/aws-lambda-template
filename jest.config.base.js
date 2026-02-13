module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json' 
    }]
  },

  transformIgnorePatterns: [
    'node_modules/(?!(@middy|uuid|@aws-lambda-powertools)/)'
  ],

  moduleFileExtensions: ['ts', 'js', 'json'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.aws-sam/'],
  
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/../../common/$1'
  }
};