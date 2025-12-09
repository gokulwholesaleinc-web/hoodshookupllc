const pool = require('../db/pool')

/**
 * Notification Service
 * Handles sending emails and SMS with templating and audit logging
 */

// Replace template variables with actual values
function renderTemplate(template, variables) {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  }
  return rendered
}

// Get template by name
async function getTemplate(name) {
  const result = await pool.query(
    'SELECT * FROM notification_templates WHERE name = $1 AND active = true',
    [name]
  )
  return result.rows[0]
}

// Log notification to audit trail
async function logNotification({
  templateId,
  type,
  recipient,
  subject,
  body,
  entityType,
  entityId,
  status = 'pending',
  externalId = null,
  errorMessage = null
}) {
  const result = await pool.query(
    `INSERT INTO notification_log
     (template_id, type, recipient, subject, body, related_entity_type, related_entity_id, status, external_id, error_message, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $8 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END)
     RETURNING *`,
    [templateId, type, recipient, subject, body, entityType, entityId, status, externalId, errorMessage]
  )
  return result.rows[0]
}

// Update notification status
async function updateNotificationStatus(id, status, externalId = null, errorMessage = null) {
  const updates = ['status = $2']
  const values = [id, status]
  let paramIndex = 3

  if (externalId) {
    updates.push(`external_id = $${paramIndex++}`)
    values.push(externalId)
  }
  if (errorMessage) {
    updates.push(`error_message = $${paramIndex++}`)
    values.push(errorMessage)
  }
  if (status === 'sent') {
    updates.push('sent_at = CURRENT_TIMESTAMP')
  }
  if (status === 'delivered') {
    updates.push('delivered_at = CURRENT_TIMESTAMP')
  }

  await pool.query(
    `UPDATE notification_log SET ${updates.join(', ')} WHERE id = $1`,
    values
  )
}

// Send email (placeholder - integrate with SendGrid/Resend)
async function sendEmail({ to, subject, body, templateId, entityType, entityId }) {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`)
  console.log(`[EMAIL] Body: ${body.substring(0, 100)}...`)

  // Log the notification
  const log = await logNotification({
    templateId,
    type: 'email',
    recipient: to,
    subject,
    body,
    entityType,
    entityId,
    status: 'sent' // In real implementation, this would be 'pending' until confirmed
  })

  // TODO: Integrate with SendGrid or Resend
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // const msg = { to, from: 'noreply@hoodshookups.com', subject, text: body }
  // const response = await sgMail.send(msg)
  // await updateNotificationStatus(log.id, 'sent', response[0].headers['x-message-id'])

  return log
}

// Send SMS (placeholder - integrate with Twilio)
async function sendSMS({ to, body, templateId, entityType, entityId }) {
  console.log(`[SMS] To: ${to}`)
  console.log(`[SMS] Body: ${body}`)

  // Log the notification
  const log = await logNotification({
    templateId,
    type: 'sms',
    recipient: to,
    subject: null,
    body,
    entityType,
    entityId,
    status: 'sent' // In real implementation, this would be 'pending' until confirmed
  })

  // TODO: Integrate with Twilio
  // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  // const message = await twilio.messages.create({
  //   body,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to
  // })
  // await updateNotificationStatus(log.id, 'sent', message.sid)

  return log
}

// Send notification using template
async function sendNotification({ templateName, recipient, variables, entityType, entityId }) {
  const template = await getTemplate(templateName)
  if (!template) {
    console.error(`Template not found: ${templateName}`)
    return null
  }

  const body = renderTemplate(template.body, variables)
  const subject = template.subject ? renderTemplate(template.subject, variables) : null

  if (template.type === 'email') {
    return sendEmail({
      to: recipient,
      subject,
      body,
      templateId: template.id,
      entityType,
      entityId
    })
  } else if (template.type === 'sms') {
    return sendSMS({
      to: recipient,
      body,
      templateId: template.id,
      entityType,
      entityId
    })
  }
}

// Convenience methods for common notifications
async function notifyQuoteReceived(quote) {
  const variables = {
    customer_name: quote.name,
    service_name: quote.service_name || quote.service,
    address: quote.address,
    message: quote.message || 'No additional details'
  }

  // Send to customer
  if (quote.email) {
    await sendNotification({
      templateName: 'quote_received_email',
      recipient: quote.email,
      variables,
      entityType: 'quote',
      entityId: quote.id
    })
  }
  if (quote.phone) {
    await sendNotification({
      templateName: 'quote_received_sms',
      recipient: quote.phone,
      variables,
      entityType: 'quote',
      entityId: quote.id
    })
  }

  // Notify admin
  const adminVariables = {
    ...variables,
    phone: quote.phone,
    email: quote.email,
    admin_link: `${process.env.APP_URL || 'http://localhost:9000'}/admin`
  }

  // Get admin contact (simplified - in production, get from settings)
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPhone = process.env.ADMIN_PHONE

  if (adminEmail) {
    await sendNotification({
      templateName: 'new_lead_admin_email',
      recipient: adminEmail,
      variables: adminVariables,
      entityType: 'quote',
      entityId: quote.id
    })
  }
  if (adminPhone) {
    await sendNotification({
      templateName: 'new_lead_admin_sms',
      recipient: adminPhone,
      variables: adminVariables,
      entityType: 'quote',
      entityId: quote.id
    })
  }
}

async function notifyPriceResponse(quote, response, business) {
  const approvalLink = `${process.env.APP_URL || 'http://localhost:9000'}/approve/${response.id}`

  const variables = {
    customer_name: quote.name,
    service_name: quote.service_name,
    price: response.price,
    price_description: response.price_description || '',
    message: response.message || '',
    valid_until: response.valid_until ? new Date(response.valid_until).toLocaleDateString() : 'N/A',
    approval_link: approvalLink
  }

  if (quote.email) {
    await sendNotification({
      templateName: 'price_response_email',
      recipient: quote.email,
      variables,
      entityType: 'quote_response',
      entityId: response.id
    })
  }
  if (quote.phone) {
    await sendNotification({
      templateName: 'price_response_sms',
      recipient: quote.phone,
      variables,
      entityType: 'quote_response',
      entityId: response.id
    })
  }
}

async function notifyScheduleRequest(quote, response, business) {
  const schedulingLink = `${process.env.APP_URL || 'http://localhost:9000'}/schedule/${response.id}`

  const variables = {
    customer_name: quote.name,
    service_name: quote.service_name,
    business_name: business.name,
    price: response.price,
    scheduling_link: schedulingLink
  }

  if (quote.email) {
    await sendNotification({
      templateName: 'schedule_request_email',
      recipient: quote.email,
      variables,
      entityType: 'quote_response',
      entityId: response.id
    })
  }
  if (quote.phone) {
    await sendNotification({
      templateName: 'schedule_request_sms',
      recipient: quote.phone,
      variables,
      entityType: 'quote_response',
      entityId: response.id
    })
  }
}

async function notifyAppointmentConfirmed(appointment, quote, business) {
  const variables = {
    customer_name: quote.name,
    service_name: quote.service_name,
    scheduled_date: new Date(appointment.scheduled_date).toLocaleDateString(),
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    business_name: business.name,
    address: quote.address,
    price: appointment.price || 'As quoted'
  }

  if (quote.email) {
    await sendNotification({
      templateName: 'appointment_confirmed_email',
      recipient: quote.email,
      variables,
      entityType: 'appointment',
      entityId: appointment.id
    })
  }
  if (quote.phone) {
    await sendNotification({
      templateName: 'appointment_confirmed_sms',
      recipient: quote.phone,
      variables,
      entityType: 'appointment',
      entityId: appointment.id
    })
  }
}

async function notifyAppointmentReminder(appointment, quote, business) {
  const variables = {
    customer_name: quote.name,
    service_name: quote.service_name,
    scheduled_date: new Date(appointment.scheduled_date).toLocaleDateString(),
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    business_name: business.name,
    address: quote.address
  }

  if (quote.email) {
    await sendNotification({
      templateName: 'appointment_reminder_email',
      recipient: quote.email,
      variables,
      entityType: 'appointment',
      entityId: appointment.id
    })
  }
  if (quote.phone) {
    await sendNotification({
      templateName: 'appointment_reminder_sms',
      recipient: quote.phone,
      variables,
      entityType: 'appointment',
      entityId: appointment.id
    })
  }

  // Mark reminder as sent
  await pool.query('UPDATE appointments SET reminder_sent = true WHERE id = $1', [appointment.id])
}

module.exports = {
  sendNotification,
  notifyQuoteReceived,
  notifyPriceResponse,
  notifyScheduleRequest,
  notifyAppointmentConfirmed,
  notifyAppointmentReminder,
  getTemplate,
  renderTemplate
}
