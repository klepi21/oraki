import type { MetadataRoute } from "next";

/**
 * Only the marketing landing page is meant for search engines. The tutor
 * app and the student link pages are private by design; student links
 * additionally have unguessable random paths and per-page noindex, so a
 * leaked link never ends up in a search index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/onboarding", "/sign-in", "/sign-up", "/preview", "/api/"],
    },
    sitemap: "https://oraki.gr/sitemap.xml",
  };
}
