import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// Cache-/Queue-Bindings werden von Freebuff Sites bereitgestellt:
// NEXT_INC_CACHE_R2_BUCKET, NEXT_CACHE_DO_QUEUE, NEXT_TAG_CACHE_DO_SHARDED.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  tagCache: doShardedTagCache()
});
