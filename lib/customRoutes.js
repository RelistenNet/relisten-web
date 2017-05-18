const routes = [
  'about',
  'ios'
]

export const routesRegex = new RegExp(routes.join("|"), 'gi')

export default routes