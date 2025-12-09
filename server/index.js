const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
}

// In-memory storage for leads (replace with database later)
const leads = []

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Create a new lead
app.post('/api/leads', (req, res) => {
  const { name, phone, email, address, service, message } = req.body

  if (!name || !phone || !email || !address || !service) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const lead = {
    id: Date.now().toString(),
    name,
    phone,
    email,
    address,
    service,
    message: message || '',
    status: 'new',
    createdAt: new Date().toISOString()
  }

  leads.push(lead)
  console.log('New lead received:', lead)

  res.status(201).json({ success: true, lead })
})

// Get all leads (admin endpoint)
app.get('/api/leads', (req, res) => {
  res.json({ leads })
})

// Get single lead
app.get('/api/leads/:id', (req, res) => {
  const lead = leads.find(l => l.id === req.params.id)
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' })
  }
  res.json({ lead })
})

// Update lead status
app.patch('/api/leads/:id', (req, res) => {
  const lead = leads.find(l => l.id === req.params.id)
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' })
  }

  const { status } = req.body
  if (status) {
    lead.status = status
    lead.updatedAt = new Date().toISOString()
  }

  res.json({ success: true, lead })
})

// Forward lead to service provider
app.post('/api/leads/forward', (req, res) => {
  const { leadId, method, contact } = req.body

  const lead = leads.find(l => l.id === leadId)
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' })
  }

  // In production, this would send an email or SMS
  // For now, just log and update the lead
  console.log(`\n========== LEAD FORWARDED ==========`)
  console.log(`Method: ${method.toUpperCase()}`)
  console.log(`To: ${contact}`)
  console.log(`---`)
  console.log(`Customer: ${lead.name}`)
  console.log(`Phone: ${lead.phone}`)
  console.log(`Email: ${lead.email}`)
  console.log(`Service: ${lead.service}`)
  console.log(`Address: ${lead.address}`)
  console.log(`Message: ${lead.message || 'N/A'}`)
  console.log(`====================================\n`)

  // Track forwarding
  lead.forwardedTo = contact
  lead.forwardedAt = new Date().toISOString()
  lead.forwardMethod = method

  res.json({ success: true, message: `Lead forwarded via ${method} to ${contact}` })
})

// Service providers (contacts to forward leads to)
const serviceProviders = []

// Add service provider
app.post('/api/providers', (req, res) => {
  const { name, email, phone, services } = req.body

  const provider = {
    id: Date.now().toString(),
    name,
    email,
    phone,
    services: services || [],
    createdAt: new Date().toISOString()
  }

  serviceProviders.push(provider)
  res.status(201).json({ success: true, provider })
})

// Get all providers
app.get('/api/providers', (req, res) => {
  res.json({ providers: serviceProviders })
})

// Serve SPA for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
