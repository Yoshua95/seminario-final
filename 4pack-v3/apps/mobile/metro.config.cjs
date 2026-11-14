const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Domain uses NodeNext .js specifiers; resolve the TypeScript source for Metro.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "./operator.js" && context.originModulePath.includes("packages")) {
    return context.resolveRequest(context, "./operator.ts", platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
