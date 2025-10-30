import next from 'eslint-config-next'

const config = [
  ...next,
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'coverage/**'], // add coverage here
    rules: {
      'no-console': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default config