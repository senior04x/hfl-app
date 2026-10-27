module.exports = ({ config }) => {
  const stage = process.env.EXPO_PUBLIC_PERSONAL_AUTH_STAGE;
  if (process.env.EAS_BUILD_PROFILE === 'production' &&
      (stage !== 'production' || process.env.EXPO_PUBLIC_GOOGLE_LOGIN_ENABLED !== 'true')) {
    throw new Error('Production builds require production personal auth and Google login configuration.');
  }
  return {
    ...config,
    runtimeVersion: stage === 'cloud-test' ? 'sdk58-preview-1' : 'sdk58-1',
    ios: { ...config.ios, icon: './assets/images/app-icon-large.png' },
  };
};
