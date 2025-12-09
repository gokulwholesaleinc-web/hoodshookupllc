const pool = require('../db/pool')

/**
 * Analytics Service
 * Collects and aggregates data for admin dashboards
 */

// ===== QUOTE/LEAD ANALYTICS =====

async function getQuoteStats(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'WHERE q.created_at >= $1 AND q.created_at <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  // Overall counts by status
  const statusCounts = await pool.query(`
    SELECT
      status,
      COUNT(*) as count
    FROM quotes q
    ${dateFilter}
    GROUP BY status
  `, params)

  // Total quotes
  const totalResult = await pool.query(`
    SELECT COUNT(*) as total FROM quotes q ${dateFilter}
  `, params)

  // Conversion funnel
  const funnelResult = await pool.query(`
    SELECT
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN status IN ('in_review', 'accepted', 'scheduled', 'completed') THEN 1 END) as responded,
      COUNT(CASE WHEN status IN ('accepted', 'scheduled', 'completed') THEN 1 END) as accepted,
      COUNT(CASE WHEN status IN ('scheduled', 'completed') THEN 1 END) as scheduled,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM quotes q
    ${dateFilter}
  `, params)

  const funnel = funnelResult.rows[0]
  const conversionRates = {
    responseRate: funnel.total_quotes > 0 ? (funnel.responded / funnel.total_quotes * 100).toFixed(1) : 0,
    acceptanceRate: funnel.responded > 0 ? (funnel.accepted / funnel.responded * 100).toFixed(1) : 0,
    schedulingRate: funnel.accepted > 0 ? (funnel.scheduled / funnel.accepted * 100).toFixed(1) : 0,
    completionRate: funnel.scheduled > 0 ? (funnel.completed / funnel.scheduled * 100).toFixed(1) : 0,
    overallConversion: funnel.total_quotes > 0 ? (funnel.completed / funnel.total_quotes * 100).toFixed(1) : 0
  }

  return {
    total: parseInt(totalResult.rows[0].total),
    byStatus: statusCounts.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count)
      return acc
    }, {}),
    funnel: {
      totalQuotes: parseInt(funnel.total_quotes),
      responded: parseInt(funnel.responded),
      accepted: parseInt(funnel.accepted),
      scheduled: parseInt(funnel.scheduled),
      completed: parseInt(funnel.completed)
    },
    conversionRates
  }
}

async function getQuotesByService(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'AND q.created_at >= $1 AND q.created_at <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  const result = await pool.query(`
    SELECT
      s.name as service_name,
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN q.status IN ('accepted', 'scheduled', 'completed') THEN 1 END) as converted
    FROM quotes q
    JOIN services s ON q.service_id = s.id
    WHERE 1=1 ${dateFilter}
    GROUP BY s.id, s.name
    ORDER BY total_quotes DESC
  `, params)

  return result.rows.map(row => ({
    serviceName: row.service_name,
    totalQuotes: parseInt(row.total_quotes),
    completed: parseInt(row.completed),
    converted: parseInt(row.converted),
    conversionRate: row.total_quotes > 0 ? (row.converted / row.total_quotes * 100).toFixed(1) : 0
  }))
}

async function getQuotesByDay(days = 30) {
  const result = await pool.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM quotes
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `)

  return result.rows.map(row => ({
    date: row.date,
    count: parseInt(row.count),
    completed: parseInt(row.completed)
  }))
}

async function getQuotesByHour() {
  const result = await pool.query(`
    SELECT
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as count
    FROM quotes
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  `)

  return result.rows.map(row => ({
    hour: parseInt(row.hour),
    count: parseInt(row.count)
  }))
}

// ===== APPOINTMENT ANALYTICS =====

async function getAppointmentStats(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'WHERE a.scheduled_date >= $1 AND a.scheduled_date <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  const statusCounts = await pool.query(`
    SELECT
      status,
      COUNT(*) as count
    FROM appointments a
    ${dateFilter}
    GROUP BY status
  `, params)

  const totalResult = await pool.query(`
    SELECT COUNT(*) as total FROM appointments a ${dateFilter}
  `, params)

  // Calculate rates
  const stats = statusCounts.rows.reduce((acc, row) => {
    acc[row.status] = parseInt(row.count)
    return acc
  }, {})

  const total = parseInt(totalResult.rows[0].total)

  return {
    total,
    byStatus: stats,
    rates: {
      completionRate: total > 0 ? ((stats.completed || 0) / total * 100).toFixed(1) : 0,
      cancellationRate: total > 0 ? ((stats.cancelled || 0) / total * 100).toFixed(1) : 0,
      noShowRate: total > 0 ? ((stats.no_show || 0) / total * 100).toFixed(1) : 0
    }
  }
}

async function getAppointmentsByBusiness(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'AND a.scheduled_date >= $1 AND a.scheduled_date <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  const result = await pool.query(`
    SELECT
      b.id,
      b.name as business_name,
      COUNT(*) as total_appointments,
      COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows
    FROM appointments a
    JOIN businesses b ON a.business_id = b.id
    WHERE 1=1 ${dateFilter}
    GROUP BY b.id, b.name
    ORDER BY total_appointments DESC
  `, params)

  return result.rows.map(row => ({
    businessId: row.id,
    businessName: row.business_name,
    totalAppointments: parseInt(row.total_appointments),
    completed: parseInt(row.completed),
    cancelled: parseInt(row.cancelled),
    noShows: parseInt(row.no_shows),
    completionRate: row.total_appointments > 0
      ? (row.completed / row.total_appointments * 100).toFixed(1)
      : 0
  }))
}

async function getUpcomingAppointments(limit = 10) {
  const result = await pool.query(`
    SELECT
      a.*,
      q.name as customer_name,
      q.phone,
      q.email,
      q.address,
      s.name as service_name,
      b.name as business_name
    FROM appointments a
    JOIN quotes q ON a.quote_id = q.id
    LEFT JOIN services s ON q.service_id = s.id
    LEFT JOIN businesses b ON a.business_id = b.id
    WHERE a.scheduled_date >= CURRENT_DATE
      AND a.status IN ('pending', 'confirmed')
    ORDER BY a.scheduled_date, a.start_time
    LIMIT $1
  `, [limit])

  return result.rows
}

// ===== REVENUE/PRICING ANALYTICS =====

async function getRevenueStats(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'AND qr.created_at >= $1 AND qr.created_at <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  // Quote response pricing stats
  const pricingResult = await pool.query(`
    SELECT
      COUNT(*) as total_quotes,
      SUM(qr.price) as total_quoted,
      AVG(qr.price) as avg_price,
      MIN(qr.price) as min_price,
      MAX(qr.price) as max_price,
      SUM(CASE WHEN qr.status = 'approved' THEN qr.price ELSE 0 END) as approved_value,
      COUNT(CASE WHEN qr.status = 'approved' THEN 1 END) as approved_count
    FROM quote_responses qr
    WHERE 1=1 ${dateFilter}
  `, params)

  // Revenue by service
  const byServiceResult = await pool.query(`
    SELECT
      s.name as service_name,
      COUNT(*) as quote_count,
      SUM(qr.price) as total_quoted,
      AVG(qr.price) as avg_price,
      SUM(CASE WHEN qr.status = 'approved' THEN qr.price ELSE 0 END) as approved_value
    FROM quote_responses qr
    JOIN quotes q ON qr.quote_id = q.id
    JOIN services s ON q.service_id = s.id
    WHERE 1=1 ${dateFilter}
    GROUP BY s.id, s.name
    ORDER BY approved_value DESC
  `, params)

  // Revenue by month (last 12 months)
  const monthlyResult = await pool.query(`
    SELECT
      TO_CHAR(qr.created_at, 'YYYY-MM') as month,
      SUM(CASE WHEN qr.status = 'approved' THEN qr.price ELSE 0 END) as revenue,
      COUNT(CASE WHEN qr.status = 'approved' THEN 1 END) as deals
    FROM quote_responses qr
    WHERE qr.created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(qr.created_at, 'YYYY-MM')
    ORDER BY month
  `)

  const pricing = pricingResult.rows[0]

  return {
    summary: {
      totalQuoted: parseFloat(pricing.total_quoted || 0).toFixed(2),
      approvedValue: parseFloat(pricing.approved_value || 0).toFixed(2),
      avgPrice: parseFloat(pricing.avg_price || 0).toFixed(2),
      minPrice: parseFloat(pricing.min_price || 0).toFixed(2),
      maxPrice: parseFloat(pricing.max_price || 0).toFixed(2),
      totalQuotes: parseInt(pricing.total_quotes || 0),
      approvedCount: parseInt(pricing.approved_count || 0),
      approvalRate: pricing.total_quotes > 0
        ? (pricing.approved_count / pricing.total_quotes * 100).toFixed(1)
        : 0
    },
    byService: byServiceResult.rows.map(row => ({
      serviceName: row.service_name,
      quoteCount: parseInt(row.quote_count),
      totalQuoted: parseFloat(row.total_quoted || 0).toFixed(2),
      avgPrice: parseFloat(row.avg_price || 0).toFixed(2),
      approvedValue: parseFloat(row.approved_value || 0).toFixed(2)
    })),
    monthly: monthlyResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue || 0).toFixed(2),
      deals: parseInt(row.deals)
    }))
  }
}

// ===== CUSTOMER ANALYTICS =====

async function getCustomerStats() {
  // Total customers
  const totalResult = await pool.query(`
    SELECT COUNT(DISTINCT user_id) as total FROM quotes WHERE user_id IS NOT NULL
  `)

  // New vs returning
  const customerTypeResult = await pool.query(`
    SELECT
      CASE WHEN quote_count = 1 THEN 'new' ELSE 'returning' END as customer_type,
      COUNT(*) as count
    FROM (
      SELECT user_id, COUNT(*) as quote_count
      FROM quotes
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    ) customer_quotes
    GROUP BY CASE WHEN quote_count = 1 THEN 'new' ELSE 'returning' END
  `)

  // Top customers by quote count
  const topCustomersResult = await pool.query(`
    SELECT
      q.user_id,
      q.name,
      q.email,
      q.phone,
      COUNT(*) as quote_count,
      COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed_count,
      MAX(q.created_at) as last_quote_date
    FROM quotes q
    WHERE q.user_id IS NOT NULL
    GROUP BY q.user_id, q.name, q.email, q.phone
    ORDER BY quote_count DESC
    LIMIT 20
  `)

  // Customers by location (city from address)
  const locationResult = await pool.query(`
    SELECT
      SUBSTRING(address FROM '([A-Za-z ]+), [A-Z]{2}') as city,
      COUNT(DISTINCT user_id) as customer_count,
      COUNT(*) as quote_count
    FROM quotes
    WHERE address IS NOT NULL
    GROUP BY SUBSTRING(address FROM '([A-Za-z ]+), [A-Z]{2}')
    HAVING SUBSTRING(address FROM '([A-Za-z ]+), [A-Z]{2}') IS NOT NULL
    ORDER BY quote_count DESC
    LIMIT 10
  `)

  return {
    total: parseInt(totalResult.rows[0].total),
    byType: customerTypeResult.rows.reduce((acc, row) => {
      acc[row.customer_type] = parseInt(row.count)
      return acc
    }, {}),
    topCustomers: topCustomersResult.rows.map(row => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      quoteCount: parseInt(row.quote_count),
      completedCount: parseInt(row.completed_count),
      lastQuoteDate: row.last_quote_date
    })),
    byLocation: locationResult.rows.map(row => ({
      city: row.city,
      customerCount: parseInt(row.customer_count),
      quoteCount: parseInt(row.quote_count)
    }))
  }
}

// ===== NOTIFICATION ANALYTICS =====

async function getNotificationStats(startDate, endDate) {
  const dateFilter = startDate && endDate
    ? 'WHERE created_at >= $1 AND created_at <= $2'
    : ''
  const params = startDate && endDate ? [startDate, endDate] : []

  // By type and status
  const statsResult = await pool.query(`
    SELECT
      type,
      status,
      COUNT(*) as count
    FROM notification_log
    ${dateFilter}
    GROUP BY type, status
    ORDER BY type, status
  `, params)

  // By template
  const templateResult = await pool.query(`
    SELECT
      nt.name as template_name,
      nl.type,
      COUNT(*) as count,
      COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) as sent,
      COUNT(CASE WHEN nl.status = 'delivered' THEN 1 END) as delivered,
      COUNT(CASE WHEN nl.status = 'failed' THEN 1 END) as failed
    FROM notification_log nl
    LEFT JOIN notification_templates nt ON nl.template_id = nt.id
    ${dateFilter ? dateFilter.replace('WHERE', 'WHERE nl.') : ''}
    GROUP BY nt.name, nl.type
    ORDER BY count DESC
  `, params)

  // Recent failures
  const failuresResult = await pool.query(`
    SELECT
      id, type, recipient, error_message, created_at
    FROM notification_log
    WHERE status = 'failed'
    ORDER BY created_at DESC
    LIMIT 10
  `)

  // Aggregate by type
  const byType = {}
  statsResult.rows.forEach(row => {
    if (!byType[row.type]) {
      byType[row.type] = { total: 0, byStatus: {} }
    }
    byType[row.type].total += parseInt(row.count)
    byType[row.type].byStatus[row.status] = parseInt(row.count)
  })

  return {
    byType,
    byTemplate: templateResult.rows.map(row => ({
      templateName: row.template_name || 'Unknown',
      type: row.type,
      total: parseInt(row.count),
      sent: parseInt(row.sent),
      delivered: parseInt(row.delivered),
      failed: parseInt(row.failed),
      deliveryRate: row.count > 0 ? ((row.delivered / row.count) * 100).toFixed(1) : 0
    })),
    recentFailures: failuresResult.rows
  }
}

// ===== BUSINESS ANALYTICS =====

async function getBusinessStats() {
  // Total businesses
  const totalResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN active = true THEN 1 END) as active,
      COUNT(CASE WHEN accepts_new_leads = true THEN 1 END) as accepting_leads
    FROM businesses
  `)

  // By category
  const byCategoryResult = await pool.query(`
    SELECT
      bc.name as category_name,
      COUNT(b.id) as business_count
    FROM business_categories bc
    LEFT JOIN businesses b ON bc.id = b.category_id AND b.active = true
    WHERE bc.active = true
    GROUP BY bc.id, bc.name
    ORDER BY business_count DESC
  `)

  // Top performers
  const topPerformersResult = await pool.query(`
    SELECT
      b.id,
      b.name,
      COUNT(a.id) as total_appointments,
      COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
      COALESCE(SUM(CASE WHEN qr.status = 'approved' THEN qr.price END), 0) as total_revenue
    FROM businesses b
    LEFT JOIN appointments a ON b.id = a.business_id
    LEFT JOIN quote_responses qr ON a.quote_response_id = qr.id
    GROUP BY b.id, b.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `)

  return {
    summary: {
      total: parseInt(totalResult.rows[0].total),
      active: parseInt(totalResult.rows[0].active),
      acceptingLeads: parseInt(totalResult.rows[0].accepting_leads)
    },
    byCategory: byCategoryResult.rows.map(row => ({
      categoryName: row.category_name,
      businessCount: parseInt(row.business_count)
    })),
    topPerformers: topPerformersResult.rows.map(row => ({
      businessId: row.id,
      businessName: row.name,
      totalAppointments: parseInt(row.total_appointments),
      completed: parseInt(row.completed),
      totalRevenue: parseFloat(row.total_revenue || 0).toFixed(2)
    }))
  }
}

// ===== DASHBOARD SUMMARY =====

async function getDashboardSummary() {
  // Quick stats for dashboard
  const quotesResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_quotes,
      COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week
    FROM quotes
  `)

  const appointmentsResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN scheduled_date = CURRENT_DATE THEN 1 END) as today,
      COUNT(CASE WHEN scheduled_date >= CURRENT_DATE AND scheduled_date < CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as this_week,
      COUNT(CASE WHEN status = 'pending' OR status = 'confirmed' THEN 1 END) as upcoming
    FROM appointments
  `)

  const revenueResult = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'approved' THEN price END), 0) as total_approved,
      COALESCE(SUM(CASE WHEN status = 'approved' AND created_at >= CURRENT_DATE - INTERVAL '30 days' THEN price END), 0) as last_30_days
    FROM quote_responses
  `)

  const notificationsResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today
    FROM notification_log
  `)

  return {
    quotes: {
      total: parseInt(quotesResult.rows[0].total),
      new: parseInt(quotesResult.rows[0].new_quotes),
      today: parseInt(quotesResult.rows[0].today),
      thisWeek: parseInt(quotesResult.rows[0].this_week)
    },
    appointments: {
      total: parseInt(appointmentsResult.rows[0].total),
      today: parseInt(appointmentsResult.rows[0].today),
      thisWeek: parseInt(appointmentsResult.rows[0].this_week),
      upcoming: parseInt(appointmentsResult.rows[0].upcoming)
    },
    revenue: {
      totalApproved: parseFloat(revenueResult.rows[0].total_approved || 0).toFixed(2),
      last30Days: parseFloat(revenueResult.rows[0].last_30_days || 0).toFixed(2)
    },
    notifications: {
      total: parseInt(notificationsResult.rows[0].total),
      failed: parseInt(notificationsResult.rows[0].failed),
      today: parseInt(notificationsResult.rows[0].today)
    }
  }
}

// ===== ACTIVITY LOG =====

async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) {
  await pool.query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, action, entityType, entityId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, ipAddress, userAgent]
  )
}

async function getActivityLog(filters = {}) {
  const { userId, entityType, entityId, action, limit = 50, offset = 0 } = filters

  let query = `
    SELECT al.*, u.role as user_role
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `
  const values = []
  let paramIndex = 1

  if (userId) {
    query += ` AND al.user_id = $${paramIndex++}`
    values.push(userId)
  }
  if (entityType) {
    query += ` AND al.entity_type = $${paramIndex++}`
    values.push(entityType)
  }
  if (entityId) {
    query += ` AND al.entity_id = $${paramIndex++}`
    values.push(entityId)
  }
  if (action) {
    query += ` AND al.action = $${paramIndex++}`
    values.push(action)
  }

  query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  values.push(parseInt(limit), parseInt(offset))

  const result = await pool.query(query, values)
  return result.rows
}

module.exports = {
  // Quote analytics
  getQuoteStats,
  getQuotesByService,
  getQuotesByDay,
  getQuotesByHour,

  // Appointment analytics
  getAppointmentStats,
  getAppointmentsByBusiness,
  getUpcomingAppointments,

  // Revenue analytics
  getRevenueStats,

  // Customer analytics
  getCustomerStats,

  // Notification analytics
  getNotificationStats,

  // Business analytics
  getBusinessStats,

  // Dashboard
  getDashboardSummary,

  // Activity logging
  logActivity,
  getActivityLog
}
