const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
