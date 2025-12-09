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
