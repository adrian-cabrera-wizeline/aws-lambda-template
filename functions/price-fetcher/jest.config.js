const baseConfig = require('../../jest.config.base.js');
const path = require('path');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname), // 👈 This is key
  roots: ['<rootDir>/tests'],
  displayName: 'PRICE-FETCHER'
};