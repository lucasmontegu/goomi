const { SourceSkips } = require('expo/fingerprint');

/**
 * package.json scripts never reach the native binary. Without this skip, adding a script would
 * change the runtimeVersion and cut every installed build off from OTA updates.
 * @type {import('expo/fingerprint').Config}
 */
module.exports = {
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
