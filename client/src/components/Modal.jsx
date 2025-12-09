import { useEffect } from 'react'

/**
 * Reusable modal component with mobile-first design
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {string} props.subtitle - Optional subtitle
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.maxWidth - Optional max width class (default: sm:max-w-md)
 */
function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'sm:max-w-md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-white w-full ${maxWidth} sm:mx-4 sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-2xl modal-slide-up`}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-gray-500 text-xs sm:text-sm">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
