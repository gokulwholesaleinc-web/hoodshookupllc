function Logo({ size = 'md', showText = true, dark = false }) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-2xl' },
    xl: { icon: 72, text: 'text-3xl' }
  }

  const s = sizes[size] || sizes.md
  const textColor = dark ? 'text-white' : 'text-stone-900'
  const subColor = dark ? 'text-stone-400' : 'text-stone-500'

  return (
    <div className="flex items-center gap-3">
      {/* Logo Mark */}
      <div style={{ width: s.icon, height: s.icon }} className="relative">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background shape - rounded square */}
          <rect x="4" y="4" width="92" height="92" rx="20" fill="#F59E0B" />

          {/* House roof shape */}
          <path
            d="M50 18L82 42V82H18V42L50 18Z"
            fill="#292524"
            fillOpacity="0.15"
          />

          {/* Letter H with tool/wrench integration */}
          <path
            d="M32 30V70M32 50H50M68 30V70"
            stroke="#292524"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Wrench head detail on right side of H */}
          <circle cx="68" cy="30" r="8" fill="#292524" />
          <circle cx="68" cy="30" r="4" fill="#F59E0B" />

          {/* Small house chimney accent */}
          <rect x="58" y="20" width="6" height="10" rx="2" fill="#292524" fillOpacity="0.3" />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-black ${s.text} leading-tight tracking-tight ${textColor}`}>
            Hoods Hookups
          </span>
          <span className={`text-xs font-medium ${subColor} -mt-0.5`}>
            Chicago's North Side
          </span>
        </div>
      )}
    </div>
  )
}

export function LogoMark({ size = 40, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}
      className={className}
    >
      {/* Background shape - rounded square */}
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#F59E0B" />

      {/* House roof shape */}
      <path
        d="M50 18L82 42V82H18V42L50 18Z"
        fill="#292524"
        fillOpacity="0.15"
      />

      {/* Letter H with tool/wrench integration */}
      <path
        d="M32 30V70M32 50H50M68 30V70"
        stroke="#292524"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wrench head detail on right side of H */}
      <circle cx="68" cy="30" r="8" fill="#292524" />
      <circle cx="68" cy="30" r="4" fill="#F59E0B" />

      {/* Small house chimney accent */}
      <rect x="58" y="20" width="6" height="10" rx="2" fill="#292524" fillOpacity="0.3" />
    </svg>
  )
}

export function LogoFull({ dark = false, className = '' }) {
  const textColor = dark ? '#FFFFFF' : '#292524'
  const subColor = dark ? '#A8A29E' : '#78716C'

  return (
    <svg
      viewBox="0 0 280 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Logo Mark */}
      <g transform="translate(0, 2)">
        <rect x="2" y="2" width="52" height="52" rx="12" fill="#F59E0B" />
        <path d="M28 10L48 24V48H8V24L28 10Z" fill="#292524" fillOpacity="0.15" />
        <path d="M16 16V40M16 28H28M40 16V40" stroke="#292524" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="16" r="5" fill="#292524" />
        <circle cx="40" cy="16" r="2.5" fill="#F59E0B" />
      </g>

      {/* Text */}
      <text x="68" y="32" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="900" fill={textColor}>
        Hoods Hookups
      </text>
      <text x="68" y="48" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fontWeight="500" fill={subColor}>
        Chicago's North Side
      </text>
    </svg>
  )
}

export default Logo
