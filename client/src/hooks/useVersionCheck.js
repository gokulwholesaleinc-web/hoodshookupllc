import { useState, useEffect, useCallback } from 'react'

const VERSION_CHECK_INTERVAL = 60000 // Check every 60 seconds
const VERSION_STORAGE_KEY = 'app_version'

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) return

      const data = await response.json()
      const serverVersion = data.version

      // Get stored version
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)

      if (!storedVersion) {
        // First visit - store the version
        localStorage.setItem(VERSION_STORAGE_KEY, serverVersion)
        setCurrentVersion(serverVersion)
      } else if (storedVersion !== serverVersion) {
        // Version mismatch - update available
        setUpdateAvailable(true)
        setCurrentVersion(serverVersion)
      }
    } catch (error) {
      console.error('Version check failed:', error)
    }
  }, [])

  const refreshApp = useCallback(() => {
    // Update stored version before refresh
    if (currentVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    }
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
    window.location.reload(true)
  }, [currentVersion])

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false)
    // Store current version to avoid repeated prompts
    if (currentVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    }
  }, [currentVersion])

  useEffect(() => {
    // Check on mount
    checkVersion()

    // Set up interval for periodic checks
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL)

    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion])

  return {
    updateAvailable,
    refreshApp,
    dismissUpdate,
    currentVersion
  }
}
