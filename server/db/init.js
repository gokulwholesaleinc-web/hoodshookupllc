const fs = require('fs')
const path = require('path')
const pool = require('./pool')

async function initDatabase() {
  const client = await pool.connect()
  try {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await client.query(schemaSQL)
    console.log('Database schema created successfully')

    const seedSQL = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
    await client.query(seedSQL)
    console.log('Database seeded successfully')
  } catch (err) {
    console.error('Database initialization error:', err)
    throw err
  } finally {
    client.release()
  }
}

module.exports = { initDatabase }
