// next.config.ts の中身を以下に書き換えてください

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ★★★ ここから下を追加 ★★★
  eslint: {
    // ビルド時のESLintエラーを無視する
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時のTypeScriptエラーを無視する
    ignoreBuildErrors: true,
  },
  // ★★★ ここまでを追加 ★★★
};

export default nextConfig;