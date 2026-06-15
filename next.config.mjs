import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, '') || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    remotePatterns: [{ protocol: 'http', hostname: '**' }, { protocol: 'https', hostname: '**' }],
  },
};

export default withNextIntl(nextConfig);
