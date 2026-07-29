module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // colyseus.js's prebuilt bundle uses static class blocks, which this
    // Expo SDK's default transform target doesn't support without this.
    plugins: ["@babel/plugin-transform-class-static-block"],
  };
};
