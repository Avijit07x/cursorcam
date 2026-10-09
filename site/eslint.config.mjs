import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-nested-ternary': 'error',
      'prefer-const': 'error',
    },
  },
];

export default config;
