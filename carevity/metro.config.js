const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  '@react-native-picker/picker': require('path').join(
    __dirname,
    'node_modules',
    '@react-native-picker',
    'picker',
    'dist',
    'commonjs'
  ),
};

module.exports = defaultConfig;
