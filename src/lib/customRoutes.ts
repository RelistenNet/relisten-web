const customRoutes = ['about', 'app', 'today', 'live', 'favicon.ico', '_next'];

export default new RegExp(customRoutes.join('|'), 'gi');
