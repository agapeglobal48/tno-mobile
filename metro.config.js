const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce bundle size — exclude source maps in production
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: false,
    mangle: { toplevel: false },
    output: { comments: false },
    compress: {
      sequences: true,
      dead_code: true,
      conditionals: true,
      booleans: true,
      unused: true,
      if_return: true,
      join_vars: true,
      drop_console: true, // removes all console.log in production
    },
  },
};

module.exports = config;
