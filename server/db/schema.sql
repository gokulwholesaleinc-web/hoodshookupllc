-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact methods (phone/email)
CREATE TABLE IF NOT EXISTS contact_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('phone', 'email')),
  value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  bypass_otp BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, normalized_value)
);

-- Services offered
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes/Leads
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES services(id),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'accepted', 'scheduled', 'completed', 'closed')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT NOT NULL,
  message TEXT,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote status history
CREATE TABLE IF NOT EXISTS quote_status_history (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  set_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service providers
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote-Provider links (for forwarding)
CREATE TABLE IF NOT EXISTS quote_provider_links (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
  relationship_type VARCHAR(20) DEFAULT 'lead_forward',
  forwarded_via VARCHAR(20),
  forwarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  due_date DATE,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax_total DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  issued_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(50),
  processor_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
  id SERIAL PRIMARY KEY,
  contact_method_id INTEGER REFERENCES contact_methods(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts_remaining INTEGER DEFAULT 3,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote Images (auto-delete after 30 days)
CREATE TABLE IF NOT EXISTS quote_images (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(50),
  file_size INTEGER,
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Categories
CREATE TABLE IF NOT EXISTS business_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses (enhanced provider directory)
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES business_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  service_radius_miles INTEGER DEFAULT 25,
  accepts_new_leads BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Hours (operating hours for each day)
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  slot_duration_minutes INTEGER DEFAULT 120, -- 2 hour slots by default
  UNIQUE(business_id, day_of_week)
);

-- Business Services (which services a business offers)
CREATE TABLE IF NOT EXISTS business_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  base_price DECIMAL(10, 2),
  price_description VARCHAR(255),
  UNIQUE(business_id, service_id)
);

-- Quote Responses (admin sends price to customer)
CREATE TABLE IF NOT EXISTS quote_responses (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL,
  price_description TEXT,
  message TEXT,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  responded_by_user_id INTEGER REFERENCES users(id),
  customer_responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments (scheduled service times)
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  quote_response_id INTEGER REFERENCES quote_responses(id) ON DELETE SET NULL,
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  customer_notes TEXT,
  admin_notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocked Time Slots (for holidays, vacations, etc.)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  variables TEXT, -- JSON array of available variables like {{customer_name}}, {{price}}, etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Log (audit trail for all sent notifications)
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES notification_templates(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms')),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  related_entity_type VARCHAR(50), -- 'quote', 'appointment', 'quote_response', etc.
  related_entity_id INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  external_id VARCHAR(255), -- ID from Twilio/SendGrid
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity/Audit Log (tracks all important actions)
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'quote', 'appointment', 'business', etc.
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages/Chat (simple messaging system between admin and customers)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'customer')),
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_methods_user ON contact_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_methods_normalized ON contact_methods(type, normalized_value);
CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_contact ON otp_tokens(contact_method_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_images_quote ON quote_images(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_images_expires ON quote_images(expires_at);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active);
CREATE INDEX IF NOT EXISTS idx_business_hours_business ON business_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_business_services_business ON business_services(business_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_quote ON quote_responses(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_status ON quote_responses(status);
CREATE INDEX IF NOT EXISTS idx_appointments_quote ON appointments(quote_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_business ON blocked_slots(business_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(blocked_date);
CREATE INDEX IF NOT EXISTS idx_notification_log_entity ON notification_log(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_quote ON messages(quote_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
