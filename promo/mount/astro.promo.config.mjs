import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
export default defineConfig({
  root: "/Users/user/Documents/HiKonsults/vehicle-listings",
  output: "server",
  integrations: [react()],
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
});
