/**
 * Format a date string to a readable format
 * @param {string} dateString - ISO date string
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(dateString, options = {}) {
  const defaults = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return new Date(dateString).toLocaleDateString('en-US', { ...defaults, ...options })
}

/**
 * Format time from HH:MM to 12-hour format
 * @param {string} time - Time in HH:MM format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Get status badge color classes
 * @param {string} status - Status string
 * @returns {string} Tailwind CSS classes
 */
export function getStatusColor(status) {
  const colors = {
    new: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-purple-100 text-purple-700',
    scheduled: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    closed: 'bg-gray-100 text-gray-700',
    pending: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    confirmed: 'bg-blue-100 text-blue-700',
    no_show: 'bg-red-100 text-red-700'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
