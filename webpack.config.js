/* eslint-disable @typescript-eslint/no-require-imports */
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { codecovWebpackPlugin } = require('@codecov/webpack-plugin');

// This is a standard webpack configuration function that NestJS will use
module.exports = function (options) {
  const config = options;

  // Add the BundleAnalyzerPlugin only when ANALYZE is set to true
  if (process.env.ANALYZE === 'true') {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: 'bundle-stats.json',
      }),
    );
  }

  // Add the Codecov webpack plugin for bundle analysis
  config.plugins = config.plugins || [];

  // The Codecov plugin is a function, not a constructor
  config.plugins.push(
    codecovWebpackPlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      uploadToken: process.env.CODECOV_TOKEN,
      bundleName: 'email-client-nestjs',
    }),
  );

  return config;
};
