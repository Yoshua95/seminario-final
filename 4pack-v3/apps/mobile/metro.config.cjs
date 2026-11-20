const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const path = require("node:path");
const fs = require("node:fs");
// Domain uses NodeNext .js specifiers; resolve the TypeScript source for Metro.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = (name) => {
    const resolved = context.resolveRequest(context, name, platform);
    return resolved.type === "sourceFile" && !resolved.filePath.includes("\0") && fs.existsSync(resolved.filePath)
      ? { ...resolved, filePath: fs.realpathSync(resolved.filePath) }
      : resolved;
  };
  // Worktrees can share node_modules through a Windows junction. Resolve React
  // to one physical file for both the renderer and application hooks.
  if (["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-native"].includes(moduleName)) {
    return resolve(fs.realpathSync(require.resolve(moduleName)));
  }
  if (moduleName === "@4pack/domain") return resolve(path.resolve(__dirname,"../../packages/domain/src/index.ts"));
  if (["./operator.js","./quotes.js","./cargo-publication.js"].includes(moduleName) && context.originModulePath.includes("packages")) {
    return resolve(moduleName.replace(/\.js$/, ".ts"));
  }
  return resolve(moduleName);
};
module.exports = config;
