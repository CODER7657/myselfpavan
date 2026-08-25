import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers, with a per-request nonce driving the script policy.
 *
 * The nonce matters because this page runs a single inline script (the theme
 * bootstrap, which has to execute before first paint) alongside Next's own
 * inline hydration payload. Hash-pinning those would break on every build, so
 * the nonce is minted here, handed to the layout through a request header, and
 * paired with `strict-dynamic` — which means a script the browser trusts may
 * load its own dependencies, and nothing else may run at all.
 *
 * Everything else is closed by default: no framing, no plugins, no form posts,
 * no base-tag rewriting, and exactly one host on the network allow-list.
 */

const GITHUB_API = "https://api.github.com";

function policy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is only tolerable for the dev overlay; production is strict.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Next and next/font emit inline <style>; CSS injection is low severity and
    // nonce-ing every one of them is not worth the breakage.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The agent runtime's github.repo tool is the only outbound call.
    `connect-src 'self' ${GITHUB_API}${dev ? " ws: http://localhost:*" : ""}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const dev = process.env.NODE_ENV !== "production";

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const csp = policy(nonce, dev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "xr-spatial-tracking=()",
      "interest-cohort=()",
    ].join(", ")
  );

  if (!dev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  // Static assets are served straight from the CDN; they need no nonce and
  // running middleware over them would only add latency.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|art/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
