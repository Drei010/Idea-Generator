const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Keep native Fiber and Three.js addons on the same Three.js module instance.
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === 'three') return { type: 'sourceFile', filePath: require.resolve('three') };
  return context.resolveRequest(context, name, platform);
};
module.exports = config;
