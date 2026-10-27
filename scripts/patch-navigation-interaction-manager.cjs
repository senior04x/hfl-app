const fs = require('node:fs');
const path = require('node:path');

const packagePath = require.resolve('@react-navigation/stack/package.json');
const stackPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const cardPath = path.join(path.dirname(packagePath), 'lib/module/views/Stack/Card.js');
let source = fs.readFileSync(cardPath, 'utf8');

if (!source.includes('InteractionManager')) {
  process.exit(0);
}

if (!/^7\./.test(stackPackage.version)) {
  throw new Error(`Unexpected @react-navigation/stack version ${stackPackage.version}; review the RN InteractionManager compatibility patch.`);
}

const importPattern = /import \{ Animated, InteractionManager, Platform, StyleSheet, View \} from 'react-native';/;
if (!importPattern.test(source)) {
  throw new Error('Could not locate the expected React Navigation Card.js import; patch was not applied.');
}
source = source.replace(importPattern, "import { Animated, Platform, StyleSheet, View } from 'react-native';");

const refPattern = /  const interactionHandleRef = React\.useRef\(undefined\);\r?\n/;
if (!refPattern.test(source)) {
  throw new Error('Could not locate the expected React Navigation interaction handle ref; patch was not applied.');
}
source = source.replace(refPattern, '');

const callbacksPattern = /  const onStartInteraction = useLatestCallback\(\(\) => \{[\s\S]*?\n  \}\);\r?\n  const onEndInteraction = useLatestCallback\(\(\) => \{[\s\S]*?\n  \}\);/;
if (!callbacksPattern.test(source)) {
  throw new Error('Could not locate the expected React Navigation interaction callbacks; patch was not applied.');
}
source = source.replace(
  callbacksPattern,
  '  const onStartInteraction = useLatestCallback(() => {});\n  const onEndInteraction = useLatestCallback(() => {});'
);

fs.writeFileSync(cardPath, source);
console.log(`Applied RN InteractionManager compatibility patch to @react-navigation/stack ${stackPackage.version}.`);
