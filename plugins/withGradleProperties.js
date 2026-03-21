const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Suppress Gradle 8.x deprecated feature warnings that would
 * fail the build when using the EAS cloud build environment.
 */
const withSuppressGradleDeprecations = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const addOrReplace = (key, value) => {
      const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
      if (idx >= 0) {
        props[idx].value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    addOrReplace('android.suppressUnsupportedOptionWarnings', 'true');

    return config;
  });
};

module.exports = withSuppressGradleDeprecations;
