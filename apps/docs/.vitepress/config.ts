import { defineConfig } from "vitepress";

export default defineConfig({
  title: "OpenEdit",
  description: "An open-source rich text editor. Everything is free.",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/core" },
      { text: "Examples", link: "/examples" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Features", link: "/guide/features" },
          { text: "Customization", link: "/guide/customization" },
          { text: "Collaboration and self-hosting", link: "/guide/collaboration" },
          { text: "Comments and suggestions", link: "/guide/comments" },
          { text: "Import and export", link: "/guide/import-export" },
          { text: "AI", link: "/guide/ai" },
          { text: "Accessibility", link: "/guide/accessibility" },
          { text: "Performance and size", link: "/guide/performance" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "@openedit/core", link: "/reference/core" },
          { text: "@openedit/react", link: "/reference/react" },
          { text: "@openedit/ui", link: "/reference/ui" },
          { text: "@openedit/extensions", link: "/reference/extensions" },
          { text: "@openedit/export and import", link: "/reference/export-import" },
          { text: "@openedit/ai", link: "/reference/ai" },
          { text: "Collaboration server", link: "/reference/collab-server" },
          { text: "CLI", link: "/reference/cli" },
        ],
      },
      { text: "Examples", link: "/examples" },
    ],
    search: { provider: "local" },
    footer: { message: "Released under the MIT License." },
  },
});
