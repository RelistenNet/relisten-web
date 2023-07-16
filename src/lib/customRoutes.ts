const customRoutes = [
  'about',
  'ios',
  'today',
  'live',
  'favicon.ico', // eslint-disable-line no-useless-escape
  '_next',
];

export default new RegExp(customRoutes.join('|'), 'gi');
