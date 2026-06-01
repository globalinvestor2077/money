import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/llms.txt', destination: '/api/llms-txt' },
      { source: '/llms-full.txt', destination: '/api/llms-full-txt' },
      { source: '/agent.md', destination: '/api/agent-md' }
    ];
  }
};

export default nextConfig;
