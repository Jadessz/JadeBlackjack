// Resolves a path under the app's public base URL so bundled assets load
// correctly whether the app is served from the domain root (dev) or a subpath
// like /JadeBlackjack/ (GitHub Pages). Vite injects BASE_URL at build time.
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
