import { getStatusColor } from '../utils'

function StatusBadge({ status, className = '' }) {
  return (
    <span className={`status-badge ${getStatusColor(status)} ${className}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default StatusBadge
