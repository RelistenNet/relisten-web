export default {
  output: 'standalone',
  serverExternalPackages: ['@takumi-rs/image-response'],
  async rewrites() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy_policy.html',
      },
      {
        source: '/discord',
        destination: 'https://discordapp.com/invite/73fdDSS',
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
