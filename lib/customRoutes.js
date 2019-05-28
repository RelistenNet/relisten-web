const customRoutes = [
  'about',
  'ios',
  'today',
  'live',
  'favicon\.ico', // eslint-disable-line no-useless-escape
  '_next',
];

module.exports = new RegExp(customRoutes.join('|'), 'gi');
