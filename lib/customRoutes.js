const routes = [
  'about',
  'ios',
  'today',
  'live',
  'favicon\.ico'
]

module.exports = new RegExp(routes.join("|"), 'gi')