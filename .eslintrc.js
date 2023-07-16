module.exports = {
  extends: ['@switz/eslint-config/react', '@switz/eslint-config/typescript'],
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
  },
};
