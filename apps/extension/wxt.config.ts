import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

const appUrl = process.env.APP_URL ?? process.env.WXT_APP_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  dev: {
    server: {
      host: "127.0.0.1",
      port: 3001,
      origin: "http://127.0.0.1:3001"
    }
  },
  manifest: {
    name: "Human Layer",
    short_name: "Human Layer",
    description: "Verified-human context for GitHub and Hacker News",
    homepage_url: appUrl,
    permissions: ["storage"],
    host_permissions: ["http://*/*", "https://*/*"],
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    },
    action: {
      default_title: "Human Layer"
    }
  },
  vite: () => ({
    plugins: [react()]
  })
});
