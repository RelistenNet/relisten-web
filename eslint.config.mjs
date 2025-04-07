import main from '@switz/eslint-config/eslint.config.mjs';
import mdx from '@switz/eslint-config/mdx.mjs';
import react from '@switz/eslint-config/react.mjs';
import typescript from '@switz/eslint-config/typescript.mjs';

  export default [...react, ...mdx, ...typescript, ...main];

  // module.exports = {
  //   extends: ['@switz/eslint-config/react.cjs', '@switz/eslint-config/typescript.cjs'],
  //   root: true,
  //   rules: {
  //     'react/display-name': 1,
  //     'react/no-unknown-property': [
  //       2,
  //       {
  //         ignore: ['jsx', 'global'],
  //       },
  //     ],
  //   },
  //   globals: {
  //     io: 'readonly',
  //     NodeJS: true,
  //   },
  // };
