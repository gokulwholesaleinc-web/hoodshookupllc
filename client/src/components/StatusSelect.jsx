const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' }
]

function StatusSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white ${className}`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export default StatusSelect
