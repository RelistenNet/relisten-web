const customRoutes = [
  'about',
  'ios',
  'today',
  'live',
  'favicon\.ico',
  '_next',
];

module.exports = new RegExp(customRoutes.join("|"), 'gi')