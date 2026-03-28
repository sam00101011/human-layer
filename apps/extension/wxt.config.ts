import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

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
    description: "Verified-human context for GitHub and Hacker News",
    permissions: ["storage"],
    host_permissions: ["http://*/*", "https://*/*"]
  },
  vite: () => ({
    plugins: [react()]
  })
});
