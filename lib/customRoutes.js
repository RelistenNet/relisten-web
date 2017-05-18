const routes = [
  'about',
  'ios'
]

module.exports = new RegExp(routes.join("|"), 'gi')