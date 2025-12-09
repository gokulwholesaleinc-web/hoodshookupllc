const { verifyToken, getUserById } = require('../services/auth')

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  
  const user = await getUserById(decoded.userId)
  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }
  
  req.user = user
  next()
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
