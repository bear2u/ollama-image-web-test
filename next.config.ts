import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API 라우트 타임아웃 설정 (10분)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // 외부 패키지 설정
  serverExternalPackages: [],
};

export default nextConfig;
