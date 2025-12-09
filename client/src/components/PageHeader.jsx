import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'

/**
 * Reusable page header component
 * @param {object} props
 * @param {string} props.title - Header title
 * @param {string} props.subtitle - Optional subtitle
 * @param {boolean} props.dark - Dark background variant (default: true)
 * @param {React.ReactNode} props.actions - Optional action buttons
 * @param {boolean} props.linkToHome - Whether logo links to home (default: true)
 */
function PageHeader({ title, subtitle, dark = true, actions, linkToHome = true }) {
  const Logo = linkToHome ? (
    <Link to="/" className="flex items-center gap-3">
      <LogoMark size={32} />
    </Link>
  ) : (
    <div className="flex items-center gap-3">
      <LogoMark size={32} />
    </div>
  )

  return (
    <header className={`${dark ? 'bg-stone-900 text-white' : 'bg-white border-b border-gray-200'} py-4 px-4 sticky top-0 z-40`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {Logo}
            <div>
              <h1 className={`text-base sm:text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`text-xs sm:text-sm ${dark ? 'text-stone-400' : 'text-gray-500'} hidden sm:block`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default PageHeader
