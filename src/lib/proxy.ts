/**
 * Proxy configuration module.
 *
 * Reads HTTPS_PROXY / HTTP_PROXY / ALL_PROXY from the environment and sets
 * undici's global dispatcher so that ALL native `fetch` calls (including those
 * made by @anthropic-ai/sdk, @notionhq/client, grammy, etc.) are routed
 * through the specified proxy.
 *
 * Supported proxy URLs:
 *   http://host:port
 *   http://user:pass@host:port
 *   https://host:port
 *
 * For SOCKS5 proxies, convert them to HTTP first (e.g. with a local ssh -D
 * tunnel) or use a tool like privoxy pointing at the SOCKS5 endpoint.
 *
 * Usage: call setupProxy() as early as possible in each Node.js entry point,
 * before any imports that make HTTP requests.
 */

import { ProxyAgent, setGlobalDispatcher } from 'undici'

export function setupProxy(): void {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY

  if (!proxyUrl) return

  const agent = new ProxyAgent(proxyUrl)
  setGlobalDispatcher(agent)

  // Hide credentials in log output
  const displayUrl = proxyUrl.replace(/:\/\/[^:@]+:[^@]+@/, '://**:**@')
  console.log(`[proxy] Routing outbound traffic via: ${displayUrl}`)
}
