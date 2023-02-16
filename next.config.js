module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy_policy.html',
      },
    ];
  },
};
