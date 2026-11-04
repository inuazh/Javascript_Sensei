// Extends app.json. EXPO_BASE_URL serves the web build from a sub-path
// (GitHub Pages: /Javascript_Sensei); native builds ignore it.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : null),
  },
});
