module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    // project: './tsconfig.json', // Optional for type-aware rules
  },
  plugins: [
    '@typescript-eslint',
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // Optional
    'prettier',
    'plugin:prettier/recommended' // Must be last
  ],
  env: {
    node: true,
    es2021: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_$' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
    'prettier/prettier': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.env',
  ]
};
