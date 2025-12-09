import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function ScheduleAppointment() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [scheduleData, setScheduleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [customerNotes, setCustomerNotes] = useState('')

  useEffect(() => {
    fetchScheduleData()
  }, [responseId])

  useEffect(() => {
    if (selectedDate && scheduleData?.quoteResponse?.business_id) {
      fetchAvailableSlots()
    }
  }, [selectedDate])

  const fetchScheduleData = async () => {
    try {
      const response = await fetch(`/api/schedule/${responseId}`)
      if (response.ok) {
        const data = await response.json()
        setScheduleData(data)
      } else {
        setError('Schedule not found. Please make sure your quote has been approved.')
      }
    } catch (err) {
      setError('Failed to load scheduling information')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    if (!scheduleData?.quoteResponse?.business_id) {
      // No specific business, show default 2-hour slots
      setAvailableSlots([
        { startTime: '08:00', endTime: '10:00', available: true },
        { startTime: '10:00', endTime: '12:00', available: true },
        { startTime: '12:00', endTime: '14:00', available: true },
        { startTime: '14:00', endTime: '16:00', available: true }
      ])
      return
    }

    setLoadingSlots(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(
        `/api/businesses/${scheduleData.quoteResponse.business_id}/available-slots?date=${dateStr}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (err) {
      console.error('Error fetching slots:', err)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSchedule = async () => {
    if (!token) {
      navigate(`/login?redirect=/schedule/${responseId}`)
      return
    }

    if (!selectedDate || !selectedSlot) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          quoteResponseId: parseInt(responseId),
          scheduledDate: selectedDate.toISOString().split('T')[0],
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          customerNotes
        })
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        setError('Failed to schedule appointment. Please try again.')
      }
    } catch (err) {
      setError('Failed to schedule appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const isDateAvailable = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Can't schedule in the past
    if (date < today) return false

    // Check business hours if available
    if (scheduleData?.businessHours?.length > 0) {
      const dayOfWeek = date.getDay()
      const hours = scheduleData.businessHours.find(h => h.day_of_week === dayOfWeek)
      if (!hours || hours.is_closed) return false
    }

    return true
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">Loading scheduling options...</div>
      </div>
    )
  }

  if (error && !scheduleData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Unable to Schedule</h1>
          <p className="text-stone-500">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Appointment Scheduled!</h1>
          <p className="text-stone-500 mb-4">
            Your appointment is confirmed for {selectedDate.toLocaleDateString()} at {formatTime(selectedSlot.startTime)}.
          </p>
          <p className="text-sm text-stone-400">
            You'll receive a confirmation email and a reminder before your appointment.
          </p>
        </div>
      </div>
    )
  }

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth)
  const qr = scheduleData?.quoteResponse

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 text-white py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <div className="font-bold">Hoods Hookups</div>
            <div className="text-stone-400 text-xs">Schedule Your Appointment</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 py-6">
        {/* Service Summary */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-stone-500">Service</div>
              <div className="font-bold text-stone-900">{qr?.service_name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-500">Price</div>
              <div className="font-bold text-green-600">${qr?.price}</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-bold text-stone-900">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-stone-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array(firstDay).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of month */}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
                const isAvailable = isDateAvailable(date)
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                const isToday = new Date().toDateString() === date.toDateString()

                return (
                  <button
                    key={i}
                    disabled={!isAvailable}
                    onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : isAvailable
                          ? 'hover:bg-orange-50 text-stone-900'
                          : 'text-stone-300 cursor-not-allowed'
                    } ${isToday && !isSelected ? 'ring-2 ring-orange-200' : ''}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-bold text-stone-900 mb-3">
              Available Times for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>

            {loadingSlots ? (
              <div className="text-center py-8 text-stone-500">Loading available times...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 text-stone-500">No available times on this day. Please select another date.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      selectedSlot?.startTime === slot.startTime
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-50 text-stone-700 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {selectedSlot && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-bold text-stone-900 mb-3">Additional Notes (Optional)</h3>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Any special instructions or access notes..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Confirm Button */}
        {selectedDate && selectedSlot && (
          <button
            onClick={handleSchedule}
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Confirm Appointment'}
          </button>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}

export default ScheduleAppointment
