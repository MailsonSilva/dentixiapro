import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.dentixia.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/planos",
          "/termos",
          "/privacidade",
          "/login",
          "/register",
          "/forgot",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/simulacoes",
          "/simulacoes/*",
          "/perfil",
          "/perfil/*",
          "/parceiros",
          "/parceiros/*",
          "/indique-e-ganhe",
          "/aulas",
          "/api/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
