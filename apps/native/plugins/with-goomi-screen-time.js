const { withEntitlementsPlist, withInfoPlist, withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const targets = [
  ['GoomiActivityMonitor', 'com.apple.deviceactivity.monitor-extension'],
  ['GoomiShieldAction', 'com.apple.ManagedSettings.shield-action-service'],
  ['GoomiShieldConfiguration', 'com.apple.ManagedSettingsUI.shield-configuration-service'],
];
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const plist = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>${body}</dict></plist>\n`;

module.exports = function withGoomiScreenTime(config, options = {}) {
  const bundleId = config.ios?.bundleIdentifier;
  if (!bundleId) throw new Error('Goomi Screen Time needs ios.bundleIdentifier.');
  const appGroup = options.appGroup || `group.${bundleId}.screentime`;
  const team = config.ios?.appleTeamId;
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.family-controls'] = true;
    mod.modResults['com.apple.security.application-groups'] = [...new Set([
      ...(mod.modResults['com.apple.security.application-groups'] || []), appGroup,
    ])];
    return mod;
  });
  config = withInfoPlist(config, (mod) => {
    mod.modResults.GoomiAppGroup = appGroup;
    return mod;
  });
  config = withDangerousMod(config, ['ios', async (mod) => {
    const source = path.join(mod.modRequest.projectRoot, 'modules/goomi-screen-time');
    for (const [name, extensionPoint] of targets) {
      const destination = path.join(mod.modRequest.platformProjectRoot, name);
      fs.mkdirSync(destination, { recursive: true });
      fs.copyFileSync(path.join(source, `extensions/${name}.swift`), path.join(destination, `${name}.swift`));
      // Unique per target: the xcode library skips adding a file whose path already exists in the project.
      fs.copyFileSync(path.join(source, 'ios/GoomiScreenTimeShared.swift'), path.join(destination, `${name}+Shared.swift`));
      fs.writeFileSync(path.join(destination, 'Info.plist'), plist(`
        <key>CFBundleDisplayName</key><string>Goomi</string>
        <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
        <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
        <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
        <key>CFBundlePackageType</key><string>XPC!</string>
        <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
        <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
        <key>GoomiAppGroup</key><string>${xml(appGroup)}</string>
        <key>NSExtension</key><dict>
          <key>NSExtensionPointIdentifier</key><string>${extensionPoint}</string>
          <key>NSExtensionPrincipalClass</key><string>$(PRODUCT_MODULE_NAME).${name}</string>
        </dict>`));
      fs.writeFileSync(path.join(destination, `${name}.entitlements`), plist(`
        <key>com.apple.developer.family-controls</key><true/>
        <key>com.apple.security.application-groups</key><array><string>${xml(appGroup)}</string></array>`));
      // Optional real mascot asset, copied into the shield bundle when supplied.
      if (name === 'GoomiShieldConfiguration' && options.mascotImage) {
        fs.copyFileSync(path.resolve(mod.modRequest.projectRoot, options.mascotImage), path.join(destination, 'GoomiShieldMascot.png'));
      }
    }
    return mod;
  }]);
  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    for (const [name] of targets) {
      let entry = Object.entries(project.pbxNativeTargetSection()).find(([, target]) => target && typeof target === 'object' && target.name?.replaceAll('"', '') === name);
      if (!entry) {
        const target = project.addTarget(name, 'app_extension', name, `${bundleId}.${name}`);
        const group = project.addPbxGroup([], name, name); // group path = extension folder; children use basenames
        project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
        project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
        project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
        project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
        project.addSourceFile(`${name}.swift`, { target: target.uuid }, group.uuid);
        project.addSourceFile(`${name}+Shared.swift`, { target: target.uuid }, group.uuid);
        if (name === 'GoomiShieldConfiguration' && options.mascotImage) {
          // addResourceFile assumes a top-level "Resources" group, which Expo projects don't have.
          const file = project.addFile('GoomiShieldMascot.png', group.uuid, { lastKnownFileType: 'image.png' });
          file.uuid = project.generateUuid();
          file.target = target.uuid;
          project.addToPbxBuildFileSection(file);
          project.addToPbxResourcesBuildPhase(file);
        }
        entry = [target.uuid, target.pbxNativeTarget];
      }
      const [uuid, target] = entry;
      const list = project.pbxXCConfigurationList()[target.buildConfigurationList];
      for (const item of list.buildConfigurations) {
        const settings = project.pbxXCBuildConfigurationSection()[item.value].buildSettings;
        Object.assign(settings, {
          PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}.${name}"`,
          INFOPLIST_FILE: `"${name}/Info.plist"`,
          CODE_SIGN_ENTITLEMENTS: `"${name}/${name}.entitlements"`,
          SWIFT_VERSION: '5.0',
          IPHONEOS_DEPLOYMENT_TARGET: '17.4',
          TARGETED_DEVICE_FAMILY: '"1,2"',
          APPLICATION_EXTENSION_API_ONLY: 'YES',
          GENERATE_INFOPLIST_FILE: 'NO',
          CURRENT_PROJECT_VERSION: `"${config.ios?.buildNumber || '1'}"`,
          MARKETING_VERSION: `"${config.version || '1.0.0'}"`,
          CODE_SIGN_STYLE: 'Automatic',
        });
        if (team) settings.DEVELOPMENT_TEAM = team;
      }
      project.addTargetAttribute('SystemCapabilities', {
        'com.apple.FamilyControls': { enabled: 1 },
        'com.apple.ApplicationGroups.iOS': { enabled: 1 },
      }, uuid);
    }
    return mod;
  });
  // EAS needs to know about extension identifiers before prebuild to provision them.
  config.extra ??= {};
  config.extra.eas ??= {};
  config.extra.eas.build ??= {};
  config.extra.eas.build.experimental ??= {};
  config.extra.eas.build.experimental.ios ??= {};
  const ios = config.extra.eas.build.experimental.ios;
  ios.appExtensions = [
    ...(ios.appExtensions || []).filter((item) => !targets.some(([name]) => name === item.targetName)),
    ...targets.map(([targetName]) => ({ targetName, bundleIdentifier: `${bundleId}.${targetName}`,
      entitlements: { 'com.apple.developer.family-controls': true, 'com.apple.security.application-groups': [appGroup] } })),
  ];
  return config;
};
