const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

// Create a compatibility instance using the flat config context
const compat = new FlatCompat();

// Export the config
module.exports = [
  // Include base JS config
  js.configs.recommended,

  // Convert ESLint legacy config to flat config
  ...compat.config({
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    env: {
      node: true,
      jest: true,
    },
    ignorePatterns: ['**/*.js'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  }),
  {
    // Configuration specifically for test files
    files: ['**/*.test*', '**/*.spec*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
