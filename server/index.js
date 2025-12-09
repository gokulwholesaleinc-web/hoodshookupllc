const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const pool = require('./db/pool')
const { initDatabase } = require('./db/init')
const { requestOTP, verifyOTP, loginBypass, normalizeContact } = require('./services/auth')
const { requireAuth, requireAdmin } = require('./middleware/auth')
const { noCache, longCache, htmlCache } = require('./middleware/cache')
const { upload, deleteFile, uploadDir } = require('./middleware/upload')
const notifications = require('./services/notifications')

const app = express()
const PORT = process.env.PORT || 3001

// App version for cache busting - update this when deploying new versions
const APP_VERSION = process.env.APP_VERSION || Date.now().toString()

app.use(cors())
app.use(express.json())

// Apply no-cache to all API routes by default
app.use('/api', noCache)

if (process.env.NODE_ENV === 'production') {
  // Static assets with hash in filename get long cache
  app.use('/assets', longCache, express.static(path.join(__dirname, '../client/dist/assets')))

  // Other static files (favicon, etc.) get short cache
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      }
    }
  }))
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Version endpoint for cache busting - clients check this to see if they need to refresh
app.get('/api/version', (req, res) => {
  res.json({
    version: APP_VERSION,
    buildTime: new Date().toISOString()
  })
})

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phone, email } = req.body
    const type = phone ? 'phone' : 'email'
    const value = phone || email

    if (!value) {
      return res.status(400).json({ error: 'Phone or email required' })
    }

    const result = await requestOTP(type, value)
    
    if (result.bypassOtp) {
      const loginResult = await loginBypass(result.contactMethodId)
      return res.json({ 
        success: true, 
        bypassOtp: true, 
        accessToken: loginResult.accessToken,
        userId: loginResult.userId,
        role: loginResult.role
      })
    }

    res.json({ 
      success: true, 
      contactMethodId: result.contactMethodId,
      message: 'OTP sent',
      ...(process.env.NODE_ENV !== 'production' && result.otp && { devOtp: result.otp })
    })
  } catch (err) {
    console.error('OTP request error:', err)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { contactMethodId, code } = req.body

    if (!contactMethodId || !code) {
      return res.status(400).json({ error: 'Contact method ID and code required' })
    }

    const result = await verifyOTP(contactMethodId, code)
    
    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }

    res.json({ 
      success: true, 
      accessToken: result.accessToken,
      userId: result.userId,
      role: result.role
    })
  } catch (err) {
    console.error('OTP verify error:', err)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

app.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    const contactMethods = await pool.query(
      'SELECT id, type, value, is_primary, verified_at FROM contact_methods WHERE user_id = $1',
      [req.user.id]
    )
    
    res.json({
      user: {
        id: req.user.id,
        role: req.user.role,
        createdAt: req.user.created_at
      },
      contactMethods: contactMethods.rows
    })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

app.post('/api/quotes', async (req, res) => {
  try {
    const { name, phone, email, address, service, message } = req.body

    if (!name || !phone || !email || !address || !service) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { findOrCreateUser } = require('./services/auth')
    const userResult = await findOrCreateUser('phone', phone)
    
    if (email) {
      const normalized = normalizeContact('email', email)
      const existing = await pool.query(
        'SELECT id FROM contact_methods WHERE type = $1 AND normalized_value = $2',
        ['email', normalized]
      )
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO contact_methods (user_id, type, value, normalized_value, is_primary) VALUES ($1, $2, $3, $4, false) ON CONFLICT DO NOTHING',
          [userResult.userId, 'email', email, normalized]
        )
      }
    }

    let serviceResult = await pool.query('SELECT id FROM services WHERE name = $1', [service])
    let serviceId = serviceResult.rows[0]?.id
    
    if (!serviceId) {
      const insertResult = await pool.query(
        'INSERT INTO services (name) VALUES ($1) RETURNING id',
        [service]
      )
      serviceId = insertResult.rows[0].id
    }

    const quoteResult = await pool.query(
      `INSERT INTO quotes (user_id, service_id, name, phone, email, address, message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userResult.userId, serviceId, name, phone, email, address, message || '']
    )

    await pool.query(
      'INSERT INTO quote_status_history (quote_id, status, notes) VALUES ($1, $2, $3)',
      [quoteResult.rows[0].id, 'new', 'Quote submitted']
    )

    console.log('New quote received:', quoteResult.rows[0])

    // Send notification to customer and admin
    try {
      await notifications.notifyQuoteReceived({
        ...quoteResult.rows[0],
        service_name: service
      })
    } catch (notifyErr) {
      console.error('Failed to send quote notification:', notifyErr)
    }

    res.status(201).json({ 
      success: true, 
      quote: quoteResult.rows[0],
      userId: userResult.userId,
      isNewUser: userResult.isNew
    })
  } catch (err) {
    console.error('Quote creation error:', err)
    res.status(500).json({ error: 'Failed to create quote' })
  }
})

app.get('/api/quotes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, s.name as service_name 
       FROM quotes q 
       LEFT JOIN services s ON q.service_id = s.id 
       ORDER BY q.created_at DESC`
    )
    res.json({ quotes: result.rows })
  } catch (err) {
    console.error('Get quotes error:', err)
    res.status(500).json({ error: 'Failed to get quotes' })
  }
})

app.get('/api/users/me/quotes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, s.name as service_name 
       FROM quotes q 
       LEFT JOIN services s ON q.service_id = s.id 
       WHERE q.user_id = $1 
       ORDER BY q.created_at DESC`,
      [req.user.id]
    )
    res.json({ quotes: result.rows })
  } catch (err) {
    console.error('Get user quotes error:', err)
    res.status(500).json({ error: 'Failed to get quotes' })
  }
})

app.get('/api/quotes/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, s.name as service_name 
       FROM quotes q 
       LEFT JOIN services s ON q.service_id = s.id 
       WHERE q.id = $1`,
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const quote = result.rows[0]
    if (req.user.role !== 'admin' && quote.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const history = await pool.query(
      'SELECT * FROM quote_status_history WHERE quote_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )

    res.json({ quote, statusHistory: history.rows })
  } catch (err) {
    console.error('Get quote error:', err)
    res.status(500).json({ error: 'Failed to get quote' })
  }
})

app.patch('/api/quotes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body
    
    const existing = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const updates = []
    const values = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
      
      if (status === 'accepted') {
        updates.push(`accepted_at = CURRENT_TIMESTAMP`)
      } else if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`)
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(req.params.id)

    const result = await pool.query(
      `UPDATE quotes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (status) {
      await pool.query(
        'INSERT INTO quote_status_history (quote_id, status, notes, set_by_user_id) VALUES ($1, $2, $3, $4)',
        [req.params.id, status, notes || null, req.user.id]
      )
    }

    res.json({ success: true, quote: result.rows[0] })
  } catch (err) {
    console.error('Update quote error:', err)
    res.status(500).json({ error: 'Failed to update quote' })
  }
})

app.get('/api/users/me/invoices', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, q.name as quote_name, q.address as quote_address
       FROM invoices i
       LEFT JOIN quotes q ON i.quote_id = q.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [req.user.id]
    )
    res.json({ invoices: result.rows })
  } catch (err) {
    console.error('Get invoices error:', err)
    res.status(500).json({ error: 'Failed to get invoices' })
  }
})

app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, q.name as quote_name, q.address as quote_address, q.service_id
       FROM invoices i
       LEFT JOIN quotes q ON i.quote_id = q.id
       WHERE i.id = $1`,
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const invoice = result.rows[0]
    if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const lineItems = await pool.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1',
      [req.params.id]
    )

    const payments = await pool.query(
      'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )

    res.json({ 
      invoice, 
      lineItems: lineItems.rows,
      payments: payments.rows
    })
  } catch (err) {
    console.error('Get invoice error:', err)
    res.status(500).json({ error: 'Failed to get invoice' })
  }
})

app.post('/api/invoices', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { quoteId, userId, lineItems, dueDate } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let subtotal = 0
      for (const item of lineItems) {
        subtotal += item.quantity * item.unitPrice
      }
      const taxTotal = subtotal * 0.0875
      const totalAmount = subtotal + taxTotal

      const invoiceResult = await client.query(
        `INSERT INTO invoices (user_id, quote_id, due_date, subtotal, tax_total, total_amount, status, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'issued', CURRENT_TIMESTAMP) RETURNING *`,
        [userId, quoteId || null, dueDate || null, subtotal, taxTotal, totalAmount]
      )
      const invoiceId = invoiceResult.rows[0].id

      for (const item of lineItems) {
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id, service_id, description, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, item.serviceId || null, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
        )
      }

      await client.query('COMMIT')
      res.status(201).json({ success: true, invoice: invoiceResult.rows[0] })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Create invoice error:', err)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services WHERE active = true ORDER BY name')
    res.json({ services: result.rows })
  } catch (err) {
    console.error('Get services error:', err)
    res.status(500).json({ error: 'Failed to get services' })
  }
})

app.get('/api/providers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM providers WHERE active = true ORDER BY name')
    res.json({ providers: result.rows })
  } catch (err) {
    console.error('Get providers error:', err)
    res.status(500).json({ error: 'Failed to get providers' })
  }
})

app.post('/api/providers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone } = req.body
    const result = await pool.query(
      'INSERT INTO providers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    )
    res.status(201).json({ success: true, provider: result.rows[0] })
  } catch (err) {
    console.error('Create provider error:', err)
    res.status(500).json({ error: 'Failed to create provider' })
  }
})

app.post('/api/quotes/:id/forward', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { providerId, method } = req.body
    
    const quote = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id])
    if (quote.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const provider = await pool.query('SELECT * FROM providers WHERE id = $1', [providerId])
    if (provider.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    await pool.query(
      'INSERT INTO quote_provider_links (quote_id, provider_id, relationship_type, forwarded_via) VALUES ($1, $2, $3, $4)',
      [req.params.id, providerId, 'lead_forward', method]
    )

    console.log(`Lead ${req.params.id} forwarded to provider ${provider.rows[0].name} via ${method}`)

    res.json({ success: true, message: `Quote forwarded to ${provider.rows[0].name}` })
  } catch (err) {
    console.error('Forward quote error:', err)
    res.status(500).json({ error: 'Failed to forward quote' })
  }
})

// Image upload for quotes (up to 5 images, 5MB each)
app.post('/api/quotes/:id/images', upload.array('images', 5), async (req, res) => {
  try {
    const quoteId = req.params.id

    // Verify quote exists
    const quote = await pool.query('SELECT id FROM quotes WHERE id = $1', [quoteId])
    if (quote.rows.length === 0) {
      // Clean up uploaded files
      req.files?.forEach(file => deleteFile(file.filename))
      return res.status(404).json({ error: 'Quote not found' })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' })
    }

    const uploadedImages = []

    for (const file of req.files) {
      const result = await pool.query(
        `INSERT INTO quote_images (quote_id, filename, original_name, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [quoteId, file.filename, file.originalname, file.mimetype, file.size]
      )
      uploadedImages.push(result.rows[0])
    }

    res.status(201).json({
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`
    })
  } catch (err) {
    console.error('Image upload error:', err)
    // Clean up uploaded files on error
    req.files?.forEach(file => deleteFile(file.filename))
    res.status(500).json({ error: 'Failed to upload images' })
  }
})

// Get images for a quote
app.get('/api/quotes/:id/images', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, filename, original_name, mime_type, file_size, created_at FROM quote_images WHERE quote_id = $1 ORDER BY created_at',
      [req.params.id]
    )
    res.json({ images: result.rows })
  } catch (err) {
    console.error('Get images error:', err)
    res.status(500).json({ error: 'Failed to get images' })
  }
})

// Serve uploaded images
app.get('/api/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename)
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Image not found' })
    }
  })
})

// Delete image (admin only)
app.delete('/api/images/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT filename FROM quote_images WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const filename = result.rows[0].filename
    deleteFile(filename)

    await pool.query('DELETE FROM quote_images WHERE id = $1', [req.params.id])
    res.json({ success: true, message: 'Image deleted' })
  } catch (err) {
    console.error('Delete image error:', err)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})

// ===== BUSINESS CATEGORIES =====
app.get('/api/business-categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_categories WHERE active = true ORDER BY name')
    res.json({ categories: result.rows })
  } catch (err) {
    console.error('Get business categories error:', err)
    res.status(500).json({ error: 'Failed to get business categories' })
  }
})

app.post('/api/business-categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body
    const result = await pool.query(
      'INSERT INTO business_categories (name, description, icon) VALUES ($1, $2, $3) RETURNING *',
      [name, description, icon]
    )
    res.status(201).json({ success: true, category: result.rows[0] })
  } catch (err) {
    console.error('Create business category error:', err)
    res.status(500).json({ error: 'Failed to create business category' })
  }
})

// ===== BUSINESSES =====
app.get('/api/businesses', async (req, res) => {
  try {
    const { categoryId, active } = req.query
    let query = `
      SELECT b.*, bc.name as category_name
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `
    const values = []
    let paramIndex = 1

    if (categoryId) {
      query += ` AND b.category_id = $${paramIndex++}`
      values.push(categoryId)
    }
    if (active !== undefined) {
      query += ` AND b.active = $${paramIndex++}`
      values.push(active === 'true')
    } else {
      query += ' AND b.active = true'
    }

    query += ' ORDER BY b.name'

    const result = await pool.query(query, values)
    res.json({ businesses: result.rows })
  } catch (err) {
    console.error('Get businesses error:', err)
    res.status(500).json({ error: 'Failed to get businesses' })
  }
})

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const businessResult = await pool.query(
      `SELECT b.*, bc.name as category_name
       FROM businesses b
       LEFT JOIN business_categories bc ON b.category_id = bc.id
       WHERE b.id = $1`,
      [req.params.id]
    )

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const hoursResult = await pool.query(
      'SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day_of_week',
      [req.params.id]
    )

    const servicesResult = await pool.query(
      `SELECT bs.*, s.name as service_name
       FROM business_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.business_id = $1`,
      [req.params.id]
    )

    res.json({
      business: businessResult.rows[0],
      hours: hoursResult.rows,
      services: servicesResult.rows
    })
  } catch (err) {
    console.error('Get business error:', err)
    res.status(500).json({ error: 'Failed to get business' })
  }
})

app.post('/api/businesses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      categoryId, name, description, email, phone, address, city, state, zip,
      website, logoUrl, serviceRadiusMiles, acceptsNewLeads, hours, services
    } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const businessResult = await client.query(
        `INSERT INTO businesses (category_id, name, description, email, phone, address, city, state, zip, website, logo_url, service_radius_miles, accepts_new_leads)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [categoryId, name, description, email, phone, address, city, state, zip, website, logoUrl, serviceRadiusMiles || 25, acceptsNewLeads !== false]
      )
      const businessId = businessResult.rows[0].id

      // Add business hours
      if (hours && Array.isArray(hours)) {
        for (const h of hours) {
          await client.query(
            `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed, slot_duration_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [businessId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed || false, h.slotDurationMinutes || 120]
          )
        }
      }

      // Add business services
      if (services && Array.isArray(services)) {
        for (const s of services) {
          await client.query(
            `INSERT INTO business_services (business_id, service_id, base_price, price_description)
             VALUES ($1, $2, $3, $4)`,
            [businessId, s.serviceId, s.basePrice, s.priceDescription]
          )
        }
      }

      await client.query('COMMIT')
      res.status(201).json({ success: true, business: businessResult.rows[0] })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Create business error:', err)
    res.status(500).json({ error: 'Failed to create business' })
  }
})

app.patch('/api/businesses/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      categoryId, name, description, email, phone, address, city, state, zip,
      website, logoUrl, serviceRadiusMiles, acceptsNewLeads, active, hours, services
    } = req.body

    const fields = []
    const values = []
    let paramIndex = 1

    if (categoryId !== undefined) { fields.push(`category_id = $${paramIndex++}`); values.push(categoryId) }
    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name) }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description) }
    if (email !== undefined) { fields.push(`email = $${paramIndex++}`); values.push(email) }
    if (phone !== undefined) { fields.push(`phone = $${paramIndex++}`); values.push(phone) }
    if (address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(address) }
    if (city !== undefined) { fields.push(`city = $${paramIndex++}`); values.push(city) }
    if (state !== undefined) { fields.push(`state = $${paramIndex++}`); values.push(state) }
    if (zip !== undefined) { fields.push(`zip = $${paramIndex++}`); values.push(zip) }
    if (website !== undefined) { fields.push(`website = $${paramIndex++}`); values.push(website) }
    if (logoUrl !== undefined) { fields.push(`logo_url = $${paramIndex++}`); values.push(logoUrl) }
    if (serviceRadiusMiles !== undefined) { fields.push(`service_radius_miles = $${paramIndex++}`); values.push(serviceRadiusMiles) }
    if (acceptsNewLeads !== undefined) { fields.push(`accepts_new_leads = $${paramIndex++}`); values.push(acceptsNewLeads) }
    if (active !== undefined) { fields.push(`active = $${paramIndex++}`); values.push(active) }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Business not found' })
      }

      // Update hours if provided
      if (hours && Array.isArray(hours)) {
        await client.query('DELETE FROM business_hours WHERE business_id = $1', [req.params.id])
        for (const h of hours) {
          await client.query(
            `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed, slot_duration_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.params.id, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed || false, h.slotDurationMinutes || 120]
          )
        }
      }

      // Update services if provided
      if (services && Array.isArray(services)) {
        await client.query('DELETE FROM business_services WHERE business_id = $1', [req.params.id])
        for (const s of services) {
          await client.query(
            `INSERT INTO business_services (business_id, service_id, base_price, price_description)
             VALUES ($1, $2, $3, $4)`,
            [req.params.id, s.serviceId, s.basePrice, s.priceDescription]
          )
        }
      }

      await client.query('COMMIT')
      res.json({ success: true, business: result.rows[0] })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Update business error:', err)
    res.status(500).json({ error: 'Failed to update business' })
  }
})

// ===== QUOTE RESPONSES (Admin sends price to customer) =====
app.post('/api/quotes/:id/responses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { businessId, price, priceDescription, message, validUntil } = req.body
    const quoteId = req.params.id

    const quote = await pool.query(
      `SELECT q.*, s.name as service_name FROM quotes q
       LEFT JOIN services s ON q.service_id = s.id WHERE q.id = $1`,
      [quoteId]
    )
    if (quote.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const result = await pool.query(
      `INSERT INTO quote_responses (quote_id, business_id, price, price_description, message, valid_until, responded_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [quoteId, businessId || null, price, priceDescription, message, validUntil || null, req.user.id]
    )

    // Update quote status to in_review
    await pool.query(
      `UPDATE quotes SET status = 'in_review', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [quoteId]
    )
    await pool.query(
      'INSERT INTO quote_status_history (quote_id, status, notes, set_by_user_id) VALUES ($1, $2, $3, $4)',
      [quoteId, 'in_review', 'Price quote sent to customer', req.user.id]
    )

    // Get business info for notification
    let business = null
    if (businessId) {
      const businessResult = await pool.query('SELECT * FROM businesses WHERE id = $1', [businessId])
      business = businessResult.rows[0]
    }

    // Send notification to customer
    try {
      await notifications.notifyPriceResponse(quote.rows[0], result.rows[0], business)
    } catch (notifyErr) {
      console.error('Failed to send price response notification:', notifyErr)
    }

    res.status(201).json({ success: true, response: result.rows[0] })
  } catch (err) {
    console.error('Create quote response error:', err)
    res.status(500).json({ error: 'Failed to create quote response' })
  }
})

app.get('/api/quotes/:id/responses', requireAuth, async (req, res) => {
  try {
    const quote = await pool.query('SELECT user_id FROM quotes WHERE id = $1', [req.params.id])
    if (quote.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    if (req.user.role !== 'admin' && quote.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await pool.query(
      `SELECT qr.*, b.name as business_name
       FROM quote_responses qr
       LEFT JOIN businesses b ON qr.business_id = b.id
       WHERE qr.quote_id = $1
       ORDER BY qr.created_at DESC`,
      [req.params.id]
    )
    res.json({ responses: result.rows })
  } catch (err) {
    console.error('Get quote responses error:', err)
    res.status(500).json({ error: 'Failed to get quote responses' })
  }
})

// Customer approves/rejects a quote response
app.patch('/api/quote-responses/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const response = await pool.query(
      `SELECT qr.*, q.user_id, q.id as quote_id, q.name, q.email, q.phone, q.address, s.name as service_name
       FROM quote_responses qr
       JOIN quotes q ON qr.quote_id = q.id
       LEFT JOIN services s ON q.service_id = s.id
       WHERE qr.id = $1`,
      [req.params.id]
    )

    if (response.rows.length === 0) {
      return res.status(404).json({ error: 'Quote response not found' })
    }

    const quoteResponse = response.rows[0]

    // Only the quote owner or admin can approve/reject
    if (req.user.role !== 'admin' && quoteResponse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await pool.query(
      `UPDATE quote_responses SET status = $1, customer_responded_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, req.params.id]
    )

    if (status === 'approved') {
      await pool.query(
        `UPDATE quotes SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [quoteResponse.quote_id]
      )
      await pool.query(
        'INSERT INTO quote_status_history (quote_id, status, notes, set_by_user_id) VALUES ($1, $2, $3, $4)',
        [quoteResponse.quote_id, 'accepted', 'Customer approved the price quote', req.user.id]
      )

      // Send scheduling request notification
      let business = null
      if (quoteResponse.business_id) {
        const businessResult = await pool.query('SELECT * FROM businesses WHERE id = $1', [quoteResponse.business_id])
        business = businessResult.rows[0]
      }

      try {
        await notifications.notifyScheduleRequest(quoteResponse, quoteResponse, business || { name: 'Hoods Hookups' })
      } catch (notifyErr) {
        console.error('Failed to send schedule request notification:', notifyErr)
      }
    }

    res.json({ success: true, status })
  } catch (err) {
    console.error('Update quote response error:', err)
    res.status(500).json({ error: 'Failed to update quote response' })
  }
})

// ===== APPOINTMENTS/SCHEDULING =====

// Get available time slots for a business on a specific date
app.get('/api/businesses/:id/available-slots', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) {
      return res.status(400).json({ error: 'Date is required' })
    }

    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()

    // Get business hours for this day
    const hoursResult = await pool.query(
      'SELECT * FROM business_hours WHERE business_id = $1 AND day_of_week = $2',
      [req.params.id, dayOfWeek]
    )

    if (hoursResult.rows.length === 0 || hoursResult.rows[0].is_closed) {
      return res.json({ slots: [], message: 'Business is closed on this day' })
    }

    const hours = hoursResult.rows[0]
    const slotDuration = hours.slot_duration_minutes || 120

    // Get existing appointments for this day
    const appointmentsResult = await pool.query(
      `SELECT start_time, end_time FROM appointments
       WHERE business_id = $1 AND scheduled_date = $2 AND status NOT IN ('cancelled', 'no_show')`,
      [req.params.id, date]
    )
    const bookedSlots = appointmentsResult.rows

    // Get blocked slots for this day
    const blockedResult = await pool.query(
      `SELECT start_time, end_time, all_day FROM blocked_slots
       WHERE business_id = $1 AND blocked_date = $2`,
      [req.params.id, date]
    )

    // Check if entire day is blocked
    const allDayBlocked = blockedResult.rows.some(b => b.all_day)
    if (allDayBlocked) {
      return res.json({ slots: [], message: 'This day is fully blocked' })
    }

    const blockedSlots = blockedResult.rows.filter(b => !b.all_day)

    // Generate available slots
    const slots = []
    const openTime = hours.open_time.split(':')
    const closeTime = hours.close_time.split(':')

    let currentTime = new Date(`${date}T${hours.open_time}`)
    const endTime = new Date(`${date}T${hours.close_time}`)

    while (currentTime < endTime) {
      const slotStart = currentTime.toTimeString().slice(0, 5)
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000).toTimeString().slice(0, 5)

      // Check if slot overlaps with any booked appointment
      const isBooked = bookedSlots.some(appt => {
        const apptStart = appt.start_time.slice(0, 5)
        const apptEnd = appt.end_time.slice(0, 5)
        return (slotStart < apptEnd && slotEnd > apptStart)
      })

      // Check if slot overlaps with any blocked time
      const isBlocked = blockedSlots.some(block => {
        const blockStart = block.start_time.slice(0, 5)
        const blockEnd = block.end_time.slice(0, 5)
        return (slotStart < blockEnd && slotEnd > blockStart)
      })

      if (!isBooked && !isBlocked) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: true
        })
      }

      currentTime = new Date(currentTime.getTime() + slotDuration * 60000)
    }

    res.json({
      slots,
      businessHours: {
        openTime: hours.open_time,
        closeTime: hours.close_time,
        slotDuration
      }
    })
  } catch (err) {
    console.error('Get available slots error:', err)
    res.status(500).json({ error: 'Failed to get available slots' })
  }
})

// Create appointment (customer schedules after approval)
app.post('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { quoteResponseId, scheduledDate, startTime, endTime, customerNotes } = req.body

    // Get quote response and verify ownership
    const responseResult = await pool.query(
      `SELECT qr.*, q.user_id, q.id as quote_id, q.name, q.email, q.phone, q.address, s.name as service_name
       FROM quote_responses qr
       JOIN quotes q ON qr.quote_id = q.id
       LEFT JOIN services s ON q.service_id = s.id
       WHERE qr.id = $1`,
      [quoteResponseId]
    )

    if (responseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote response not found' })
    }

    const quoteResponse = responseResult.rows[0]

    if (req.user.role !== 'admin' && quoteResponse.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (quoteResponse.status !== 'approved') {
      return res.status(400).json({ error: 'Quote must be approved before scheduling' })
    }

    // Create the appointment
    const appointmentResult = await pool.query(
      `INSERT INTO appointments (quote_id, quote_response_id, business_id, scheduled_date, start_time, end_time, customer_notes, status, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', CURRENT_TIMESTAMP) RETURNING *`,
      [quoteResponse.quote_id, quoteResponseId, quoteResponse.business_id, scheduledDate, startTime, endTime, customerNotes]
    )

    // Update quote status to scheduled
    await pool.query(
      `UPDATE quotes SET status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [quoteResponse.quote_id]
    )
    await pool.query(
      'INSERT INTO quote_status_history (quote_id, status, notes, set_by_user_id) VALUES ($1, $2, $3, $4)',
      [quoteResponse.quote_id, 'scheduled', `Appointment scheduled for ${scheduledDate} at ${startTime}`, req.user.id]
    )

    // Send confirmation notification
    let business = { name: 'Hoods Hookups' }
    if (quoteResponse.business_id) {
      const businessResult = await pool.query('SELECT * FROM businesses WHERE id = $1', [quoteResponse.business_id])
      if (businessResult.rows.length > 0) {
        business = businessResult.rows[0]
      }
    }

    try {
      await notifications.notifyAppointmentConfirmed(
        appointmentResult.rows[0],
        quoteResponse,
        business
      )
    } catch (notifyErr) {
      console.error('Failed to send appointment confirmation:', notifyErr)
    }

    res.status(201).json({ success: true, appointment: appointmentResult.rows[0] })
  } catch (err) {
    console.error('Create appointment error:', err)
    res.status(500).json({ error: 'Failed to create appointment' })
  }
})

// Get appointments (admin sees all, users see their own)
app.get('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { status, businessId, startDate, endDate } = req.query

    let query = `
      SELECT a.*, q.name as customer_name, q.phone, q.email, q.address, s.name as service_name, b.name as business_name
      FROM appointments a
      JOIN quotes q ON a.quote_id = q.id
      LEFT JOIN services s ON q.service_id = s.id
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE 1=1
    `
    const values = []
    let paramIndex = 1

    if (req.user.role !== 'admin') {
      query += ` AND q.user_id = $${paramIndex++}`
      values.push(req.user.id)
    }

    if (status) {
      query += ` AND a.status = $${paramIndex++}`
      values.push(status)
    }
    if (businessId) {
      query += ` AND a.business_id = $${paramIndex++}`
      values.push(businessId)
    }
    if (startDate) {
      query += ` AND a.scheduled_date >= $${paramIndex++}`
      values.push(startDate)
    }
    if (endDate) {
      query += ` AND a.scheduled_date <= $${paramIndex++}`
      values.push(endDate)
    }

    query += ' ORDER BY a.scheduled_date, a.start_time'

    const result = await pool.query(query, values)
    res.json({ appointments: result.rows })
  } catch (err) {
    console.error('Get appointments error:', err)
    res.status(500).json({ error: 'Failed to get appointments' })
  }
})

// Update appointment status (admin only for most operations)
app.patch('/api/appointments/:id', requireAuth, async (req, res) => {
  try {
    const { status, adminNotes, cancellationReason } = req.body

    const existing = await pool.query(
      `SELECT a.*, q.user_id FROM appointments a JOIN quotes q ON a.quote_id = q.id WHERE a.id = $1`,
      [req.params.id]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const appointment = existing.rows[0]

    // Users can only cancel their own appointments
    if (req.user.role !== 'admin') {
      if (appointment.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' })
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'You can only cancel appointments' })
      }
    }

    const updates = []
    const values = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)

      if (status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP')
      } else if (status === 'cancelled') {
        updates.push('cancelled_at = CURRENT_TIMESTAMP')
        if (cancellationReason) {
          updates.push(`cancellation_reason = $${paramIndex++}`)
          values.push(cancellationReason)
        }
      } else if (status === 'confirmed') {
        updates.push('confirmed_at = CURRENT_TIMESTAMP')
      }
    }

    if (adminNotes && req.user.role === 'admin') {
      updates.push(`admin_notes = $${paramIndex++}`)
      values.push(adminNotes)
    }

    values.push(req.params.id)

    const result = await pool.query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    // Update quote status if appointment is completed
    if (status === 'completed') {
      await pool.query(
        `UPDATE quotes SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [appointment.quote_id]
      )
      await pool.query(
        'INSERT INTO quote_status_history (quote_id, status, notes, set_by_user_id) VALUES ($1, $2, $3, $4)',
        [appointment.quote_id, 'completed', 'Service completed', req.user.id]
      )
    }

    res.json({ success: true, appointment: result.rows[0] })
  } catch (err) {
    console.error('Update appointment error:', err)
    res.status(500).json({ error: 'Failed to update appointment' })
  }
})

// ===== BLOCKED SLOTS =====
app.post('/api/businesses/:id/blocked-slots', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { blockedDate, startTime, endTime, allDay, reason } = req.body

    const result = await pool.query(
      `INSERT INTO blocked_slots (business_id, blocked_date, start_time, end_time, all_day, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, blockedDate, startTime, endTime, allDay || false, reason]
    )

    res.status(201).json({ success: true, blockedSlot: result.rows[0] })
  } catch (err) {
    console.error('Create blocked slot error:', err)
    res.status(500).json({ error: 'Failed to create blocked slot' })
  }
})

app.get('/api/businesses/:id/blocked-slots', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let query = 'SELECT * FROM blocked_slots WHERE business_id = $1'
    const values = [req.params.id]
    let paramIndex = 2

    if (startDate) {
      query += ` AND blocked_date >= $${paramIndex++}`
      values.push(startDate)
    }
    if (endDate) {
      query += ` AND blocked_date <= $${paramIndex++}`
      values.push(endDate)
    }

    query += ' ORDER BY blocked_date'

    const result = await pool.query(query, values)
    res.json({ blockedSlots: result.rows })
  } catch (err) {
    console.error('Get blocked slots error:', err)
    res.status(500).json({ error: 'Failed to get blocked slots' })
  }
})

app.delete('/api/blocked-slots/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM blocked_slots WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete blocked slot error:', err)
    res.status(500).json({ error: 'Failed to delete blocked slot' })
  }
})

// ===== NOTIFICATION LOG (Admin audit trail) =====
app.get('/api/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, status, entityType, entityId, limit = 50, offset = 0 } = req.query

    let query = `
      SELECT nl.*, nt.name as template_name
      FROM notification_log nl
      LEFT JOIN notification_templates nt ON nl.template_id = nt.id
      WHERE 1=1
    `
    const values = []
    let paramIndex = 1

    if (type) {
      query += ` AND nl.type = $${paramIndex++}`
      values.push(type)
    }
    if (status) {
      query += ` AND nl.status = $${paramIndex++}`
      values.push(status)
    }
    if (entityType) {
      query += ` AND nl.related_entity_type = $${paramIndex++}`
      values.push(entityType)
    }
    if (entityId) {
      query += ` AND nl.related_entity_id = $${paramIndex++}`
      values.push(entityId)
    }

    query += ` ORDER BY nl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    values.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, values)
    res.json({ notifications: result.rows })
  } catch (err) {
    console.error('Get notification log error:', err)
    res.status(500).json({ error: 'Failed to get notification log' })
  }
})

// ===== PUBLIC APPROVAL/SCHEDULING PAGES =====
// Get quote response details for approval page
app.get('/api/approve/:responseId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qr.*, q.name as customer_name, q.address, s.name as service_name, b.name as business_name
       FROM quote_responses qr
       JOIN quotes q ON qr.quote_id = q.id
       LEFT JOIN services s ON q.service_id = s.id
       LEFT JOIN businesses b ON qr.business_id = b.id
       WHERE qr.id = $1`,
      [req.params.responseId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote response not found' })
    }

    res.json({ quoteResponse: result.rows[0] })
  } catch (err) {
    console.error('Get approval page error:', err)
    res.status(500).json({ error: 'Failed to get quote response' })
  }
})

// Get scheduling details and business hours for scheduling page
app.get('/api/schedule/:responseId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qr.*, q.name as customer_name, q.address, s.name as service_name, b.id as business_id, b.name as business_name
       FROM quote_responses qr
       JOIN quotes q ON qr.quote_id = q.id
       LEFT JOIN services s ON q.service_id = s.id
       LEFT JOIN businesses b ON qr.business_id = b.id
       WHERE qr.id = $1 AND qr.status = 'approved'`,
      [req.params.responseId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approved quote response not found' })
    }

    const quoteResponse = result.rows[0]

    // Get business hours if business is assigned
    let hours = []
    if (quoteResponse.business_id) {
      const hoursResult = await pool.query(
        'SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day_of_week',
        [quoteResponse.business_id]
      )
      hours = hoursResult.rows
    }

    res.json({
      quoteResponse,
      businessHours: hours
    })
  } catch (err) {
    console.error('Get schedule page error:', err)
    res.status(500).json({ error: 'Failed to get scheduling info' })
  }
})

// Cleanup expired images (called on server start and can be called periodically)
async function cleanupExpiredImages() {
  try {
    const result = await pool.query(
      'SELECT id, filename FROM quote_images WHERE expires_at < CURRENT_TIMESTAMP'
    )

    for (const image of result.rows) {
      deleteFile(image.filename)
    }

    await pool.query('DELETE FROM quote_images WHERE expires_at < CURRENT_TIMESTAMP')

    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} expired images`)
    }
  } catch (err) {
    console.error('Image cleanup error:', err)
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredImages, 60 * 60 * 1000)

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

initDatabase()
  .then(() => {
    // Run cleanup on startup
    cleanupExpiredImages()

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })
