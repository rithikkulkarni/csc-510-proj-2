import next from 'eslint-config-next';

const config = [
  ...next,
  {
    extends: ['next', 'prettier'],
    ignores: ['node_modules/**', '.next/**', 'out/**', 'coverage/**'], // add coverage here
    rules: {
      'no-console': 'warn',
      'react/no-unescaped-entities': 'off',
      'prettier/prettier': 'error',
    },
  },
];

export default config;
