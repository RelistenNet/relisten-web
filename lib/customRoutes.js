const routes = [
  'about',
  'ios',
  'favicon\.ico'
]

module.exports = new RegExp(routes.join("|"), 'gi')