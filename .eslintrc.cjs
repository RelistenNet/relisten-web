module.exports = {
  extends: [
    '@switz/eslint-config/react.cjs',
    '@switz/eslint-config/typescript.cjs',
  ],
  root: true,
  rules: {
    'react/display-name': 1,
    'react/no-unknown-property': [
      2,
      {
        ignore: ['jsx', 'global'],
      },
    ],
  },
  globals: {
    io: 'readonly',
    NodeJS: true,
  },
};
