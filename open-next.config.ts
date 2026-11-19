import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Absichtlich minimal: Freebuff Sites legt Cache/Queue/Tag-Cache
// (freebuff.open-next.config.ts) darüber und überschreibt diese Datei beim Deploy.
export default defineCloudflareConfig({});
