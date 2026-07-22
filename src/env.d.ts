/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    PROGRESS: KVNamespace;
  }
}
