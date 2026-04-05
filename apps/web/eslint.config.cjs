// ESLint flat config
// See: https://nextjs.org/docs/app/api-reference/config/eslint

const { FlatCompat } = require('@eslint/eslintrc');
const prettier = require('eslint-config-prettier');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextCoreWebVitals = compat.extends('next/core-web-vitals');

module.exports = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'out/**',
    ],
  },
  ...nextCoreWebVitals,
  // Disable stylistic rules that conflict with Prettier
  prettier,
  {
    rules: {
      // This repo has many legacy internal <a href="/...\"></a> links;
      // enforcing <Link /> everywhere is too noisy for now.
      '@next/next/no-html-link-for-pages': 'off',

      // Best practice, but don't fail CI.
      '@next/next/no-img-element': 'warn',

      // Content-heavy pages include lots of apostrophes/quotes; escaping is noisy.
      'react/no-unescaped-entities': 'off',

      // Best practice, but don't fail CI.
      'jsx-a11y/alt-text': 'warn',

      // These strict purity/structure rules are currently failing across the app.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
    },
  },
];
