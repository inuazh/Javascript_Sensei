module.exports = function (api) {
  api.cache(true);
  return {
    // zustand's ESM build uses import.meta, which breaks the web bundle without this.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
