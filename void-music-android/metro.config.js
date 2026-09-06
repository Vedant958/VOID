const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 2;

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
