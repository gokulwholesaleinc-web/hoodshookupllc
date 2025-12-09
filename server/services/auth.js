const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const OTP_EXPIRY_MINUTES = 10

function normalizeContact(type, value) {
  if (type === 'email') {
    return value.toLowerCase().trim()
  }
  return value.replace(/\D/g, '')
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function findOrCreateUser(type, value) {
  const normalized = normalizeContact(type, value)
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const existing = await client.query(
      'SELECT cm.*, u.role FROM contact_methods cm JOIN users u ON cm.user_id = u.id WHERE cm.type = $1 AND cm.normalized_value = $2',
      [type, normalized]
    )
    
    if (existing.rows.length > 0) {
      await client.query('COMMIT')
      return { userId: existing.rows[0].user_id, contactMethodId: existing.rows[0].id, isNew: false, bypassOtp: existing.rows[0].bypass_otp, role: existing.rows[0].role }
    }
    
    const userResult = await client.query(
      'INSERT INTO users (role) VALUES ($1) RETURNING id',
      ['customer']
    )
    const userId = userResult.rows[0].id
    
    const cmResult = await client.query(
      'INSERT INTO contact_methods (user_id, type, value, normalized_value, is_primary) VALUES ($1, $2, $3, $4, true) RETURNING id',
      [userId, type, value, normalized]
    )
    
    await client.query('COMMIT')
    return { userId, contactMethodId: cmResult.rows[0].id, isNew: true, bypassOtp: false, role: 'customer' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function requestOTP(type, value) {
  const result = await findOrCreateUser(type, value)
  
  if (result.bypassOtp) {
    return { success: true, bypassOtp: true, contactMethodId: result.contactMethodId, userId: result.userId, role: result.role }
  }
  
  const otp = generateOTP()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  
  await pool.query(
    'UPDATE otp_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE contact_method_id = $1 AND consumed_at IS NULL',
    [result.contactMethodId]
  )
  
  await pool.query(
    'INSERT INTO otp_tokens (contact_method_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
    [result.contactMethodId, otpHash, expiresAt]
  )
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${type}:${value} is: ${otp}`)
  }
  
  return { success: true, bypassOtp: false, contactMethodId: result.contactMethodId, otp: process.env.NODE_ENV !== 'production' ? otp : undefined }
}

async function verifyOTP(contactMethodId, code) {
  const result = await pool.query(
    `SELECT ot.*, cm.user_id, cm.bypass_otp, u.role 
     FROM otp_tokens ot 
     JOIN contact_methods cm ON ot.contact_method_id = cm.id 
     JOIN users u ON cm.user_id = u.id
     WHERE ot.contact_method_id = $1 
       AND ot.consumed_at IS NULL 
       AND ot.expires_at > CURRENT_TIMESTAMP 
       AND ot.attempts_remaining > 0
     ORDER BY ot.created_at DESC 
     LIMIT 1`,
    [contactMethodId]
  )
  
  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid or expired OTP' }
  }
  
  const token = result.rows[0]
  const isValid = await bcrypt.compare(code, token.otp_hash)
  
  if (!isValid) {
    await pool.query(
      'UPDATE otp_tokens SET attempts_remaining = attempts_remaining - 1 WHERE id = $1',
      [token.id]
    )
    return { success: false, error: 'Invalid OTP code' }
  }
  
  await pool.query(
    'UPDATE otp_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1',
    [token.id]
  )
  
  await pool.query(
    'UPDATE contact_methods SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
    [contactMethodId]
  )
  
  const session = await createSession(token.user_id)
  
  return { success: true, ...session, role: token.role }
}

async function loginBypass(contactMethodId) {
  const result = await pool.query(
    `SELECT cm.user_id, cm.bypass_otp, u.role 
     FROM contact_methods cm 
     JOIN users u ON cm.user_id = u.id 
     WHERE cm.id = $1 AND cm.bypass_otp = true`,
    [contactMethodId]
  )
  
  if (result.rows.length === 0) {
    return { success: false, error: 'Bypass not allowed' }
  }
  
  const session = await createSession(result.rows[0].user_id)
  return { success: true, ...session, role: result.rows[0].role }
}

async function createSession(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' })
  const tokenHash = await bcrypt.hash(accessToken, 10)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  
  await pool.query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  )
  
  return { accessToken, userId }
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

async function getUserById(userId) {
  const result = await pool.query(
    `SELECT u.*, cm.type as primary_contact_type, cm.value as primary_contact_value
     FROM users u
     LEFT JOIN contact_methods cm ON u.id = cm.user_id AND cm.is_primary = true
     WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0] || null
}

module.exports = {
  findOrCreateUser,
  requestOTP,
  verifyOTP,
  loginBypass,
  createSession,
  verifyToken,
  getUserById,
  normalizeContact
}
