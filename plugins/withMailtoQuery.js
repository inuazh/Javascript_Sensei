// Android 11+ hides other apps from this one unless the manifest declares what
// it looks for, and Linking.canOpenURL('mailto:…') then answers false even with
// a mail app installed. This adds <queries> for mailto links, used by the
// «ошибка в задании?» report (src/services/support.ts).
const { withAndroidManifest } = require('expo/config-plugins');

const MAILTO_INTENT = {
  action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
  data: [{ $: { 'android:scheme': 'mailto' } }],
};

module.exports = function withMailtoQuery(config) {
  return withAndroidManifest(config, cfg => {
    const manifest = cfg.modResults.manifest;
    manifest.queries ??= [{}];
    const queries = manifest.queries[0];
    queries.intent ??= [];
    const present = queries.intent.some(intent =>
      intent.data?.some(d => d.$?.['android:scheme'] === 'mailto'),
    );
    if (!present) queries.intent.push(MAILTO_INTENT);
    return cfg;
  });
};
