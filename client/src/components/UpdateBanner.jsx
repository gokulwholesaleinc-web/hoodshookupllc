import { useVersionCheck } from '../hooks/useVersionCheck'

export default function UpdateBanner() {
  const { updateAvailable, refreshApp, dismissUpdate } = useVersionCheck()

  if (!updateAvailable) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">
            A new version is available!
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={dismissUpdate}
            className="text-blue-200 hover:text-white text-sm font-medium px-2 py-1 rounded transition-colors"
          >
            Later
          </button>
          <button
            onClick={refreshApp}
            className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-bold px-4 py-1.5 rounded-lg transition-colors active:scale-95"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  )
}
