import next from 'eslint-config-next';
import eslintConfigPrettier from 'eslint-config-prettier'; // disables rules that conflict with Prettier
import prettier from 'eslint-plugin-prettier'; // surfaces Prettier issues via ESLint

const config = [
  // 1) Next.js recommended rules (already flat): spread them in
  ...next,

  // 2) Turn off ESLint rules that conflict with Prettier
  eslintConfigPrettier,

  // 3) Your project-level settings
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'coverage/**', 'dist/**'],

    plugins: { prettier },

    rules: {
      // Make Prettier formatting issues show as ESLint errors
      'prettier/prettier': 'error',

      // Your prefs
      'react/no-unescaped-entities': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
];

export default config;
