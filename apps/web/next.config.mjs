/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship raw TypeScript rather than a build artefact,
  // so Next compiles them alongside the app.
  transpilePackages: [
    "@foundry/tokens",
    "@foundry/content",
    "@foundry/agent-engine",
    "@foundry/assay",
    "@foundry/ui",
  ],
  experimental: { optimizePackageImports: ["gsap"] },
};
export default nextConfig;
