import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'

function Login() {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [contactMethodId, setContactMethodId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devOtp, setDevOtp] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send code')
        return
      }

      if (data.bypassOtp) {
        login(data.accessToken, { id: data.userId, role: data.role })
        navigate(data.role === 'admin' ? '/admin' : '/dashboard')
        return
      }

      setContactMethodId(data.contactMethodId)
      if (data.devOtp) setDevOtp(data.devOtp)
      setStep('otp')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactMethodId, code: otp })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid code')
        return
      }

      login(data.accessToken, { id: data.userId, role: data.role })
      navigate(data.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <LogoMark size={48} />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Welcome Back</h1>
          <p className="text-stone-600 mt-1">Sign in to view your quotes and invoices</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-base"
                  placeholder="(773) 555-1234"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>

              <p className="text-center text-sm text-stone-500">
                We'll send you a one-time code to sign in
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Enter Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-base text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              {devOtp && (
                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm">
                  Dev mode: Your code is <strong>{devOtp}</strong>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-70"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setOtp('')
                  setError('')
                }}
                className="w-full text-stone-600 py-2 text-sm"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-stone-600 hover:text-stone-900 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
