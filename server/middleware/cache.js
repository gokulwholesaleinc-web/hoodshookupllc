/**
 * Cache Control Middleware
 * Manages HTTP cache headers for different types of resources
 */

// No cache for API responses - always get fresh data
const noCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  })
  next()
}

// Short cache for semi-dynamic content (5 minutes)
const shortCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
  })
  next()
}

// Long cache for static assets (1 year - files have hash in filename)
const longCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  next()
}

// HTML files - no cache to ensure users get latest version
const htmlCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, must-revalidate',
    'Pragma': 'no-cache',
  })
  next()
}

module.exports = {
  noCache,
  shortCache,
  longCache,
  htmlCache
}
