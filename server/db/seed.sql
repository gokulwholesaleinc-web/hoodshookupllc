-- Seed default services
INSERT INTO services (name, description) VALUES
  ('Hood Cleaning', 'Professional kitchen hood and exhaust cleaning'),
  ('Duct Cleaning', 'Commercial duct cleaning services'),
  ('Pressure Washing', 'High-pressure cleaning for exteriors'),
  ('Grease Trap Service', 'Grease trap cleaning and maintenance'),
  ('HVAC Cleaning', 'Heating and cooling system cleaning'),
  ('General Maintenance', 'General property maintenance services'),
  ('Muffler & Exhaust', 'Auto exhaust and muffler repair'),
  ('Junk Removal', 'Residential and commercial junk removal'),
  ('Plumbing', 'Plumbing repair and installation'),
  ('Painting', 'Interior and exterior painting'),
  ('Demolition', 'Demolition and site clearing'),
  ('Carpentry', 'Custom carpentry and woodwork'),
  ('Landscaping', 'Lawn care and landscaping services'),
  ('Snow Removal', 'Snow plowing and removal')
ON CONFLICT (name) DO NOTHING;

-- Seed business categories
INSERT INTO business_categories (name, description, icon) VALUES
  ('Auto Services', 'Automotive repair and maintenance', 'car'),
  ('Cleaning Services', 'Residential and commercial cleaning', 'sparkles'),
  ('Construction', 'Building, renovation, and demolition', 'hammer'),
  ('Home Services', 'General home maintenance and repair', 'home'),
  ('Landscaping', 'Lawn care and outdoor services', 'tree'),
  ('Plumbing', 'Plumbing installation and repair', 'wrench'),
  ('Electrical', 'Electrical installation and repair', 'bolt'),
  ('HVAC', 'Heating, ventilation, and air conditioning', 'thermometer')
ON CONFLICT (name) DO NOTHING;

-- Seed notification templates
INSERT INTO notification_templates (name, type, subject, body, variables) VALUES
  -- Quote received
  ('quote_received_email', 'email', 'We received your quote request - Hoods Hookups',
   'Hi {{customer_name}},

Thank you for reaching out! We''ve received your quote request for {{service_name}}.

Your request details:
- Service: {{service_name}}
- Address: {{address}}
- Message: {{message}}

We''ll review your request and get back to you with a price within 24 hours.

Best regards,
The Hoods Hookups Team',
   '["customer_name", "service_name", "address", "message"]'),

  ('quote_received_sms', 'sms', NULL,
   'Hoods Hookups: Got your quote request for {{service_name}}! We''ll get back to you within 24 hrs with a price.',
   '["service_name"]'),

  -- Price response to customer
  ('price_response_email', 'email', 'Your quote is ready - {{price}} for {{service_name}}',
   'Hi {{customer_name}},

Great news! We''ve reviewed your request and have a quote ready for you.

Service: {{service_name}}
Price: ${{price}}
{{price_description}}

{{message}}

This quote is valid until {{valid_until}}.

To proceed, simply click the link below to approve and schedule your service:
{{approval_link}}

Questions? Reply to this email or call us at (773) 555-1234.

Best,
The Hoods Hookups Team',
   '["customer_name", "service_name", "price", "price_description", "message", "valid_until", "approval_link"]'),

  ('price_response_sms', 'sms', NULL,
   'Hoods Hookups: Your quote for {{service_name}} is ready! Price: ${{price}}. Approve & schedule here: {{approval_link}}',
   '["service_name", "price", "approval_link"]'),

  -- Customer approved - schedule request
  ('schedule_request_email', 'email', 'Schedule your {{service_name}} appointment',
   'Hi {{customer_name}},

Thanks for approving your quote! Now let''s get your service scheduled.

Click below to choose a time that works for you:
{{scheduling_link}}

Service: {{service_name}}
Provider: {{business_name}}
Price: ${{price}}

Available times are shown in 2-hour windows during business hours.

Best,
The Hoods Hookups Team',
   '["customer_name", "service_name", "business_name", "price", "scheduling_link"]'),

  ('schedule_request_sms', 'sms', NULL,
   'Hoods Hookups: Pick your appointment time for {{service_name}}: {{scheduling_link}}',
   '["service_name", "scheduling_link"]'),

  -- Appointment confirmed
  ('appointment_confirmed_email', 'email', 'Appointment Confirmed - {{scheduled_date}} at {{start_time}}',
   'Hi {{customer_name}},

Your appointment is confirmed!

Service: {{service_name}}
Date: {{scheduled_date}}
Time: {{start_time}} - {{end_time}}
Provider: {{business_name}}
Address: {{address}}
Price: ${{price}}

We''ll send you a reminder the day before.

Need to reschedule? Contact us at (773) 555-1234.

Best,
The Hoods Hookups Team',
   '["customer_name", "service_name", "scheduled_date", "start_time", "end_time", "business_name", "address", "price"]'),

  ('appointment_confirmed_sms', 'sms', NULL,
   'Hoods Hookups: Confirmed! {{service_name}} on {{scheduled_date}} at {{start_time}}. {{business_name}} will see you then!',
   '["service_name", "scheduled_date", "start_time", "business_name"]'),

  -- Appointment reminder
  ('appointment_reminder_email', 'email', 'Reminder: {{service_name}} tomorrow at {{start_time}}',
   'Hi {{customer_name}},

This is a friendly reminder about your appointment tomorrow!

Service: {{service_name}}
Date: {{scheduled_date}}
Time: {{start_time}} - {{end_time}}
Provider: {{business_name}}
Address: {{address}}

Need to reschedule? Please let us know ASAP at (773) 555-1234.

See you soon!
The Hoods Hookups Team',
   '["customer_name", "service_name", "scheduled_date", "start_time", "end_time", "business_name", "address"]'),

  ('appointment_reminder_sms', 'sms', NULL,
   'Hoods Hookups reminder: {{service_name}} tomorrow at {{start_time}}. See you at {{address}}!',
   '["service_name", "start_time", "address"]'),

  -- New lead notification for admin
  ('new_lead_admin_email', 'email', 'New Lead: {{service_name}} from {{customer_name}}',
   'New quote request received!

Customer: {{customer_name}}
Phone: {{phone}}
Email: {{email}}
Service: {{service_name}}
Address: {{address}}
Message: {{message}}

View in admin: {{admin_link}}',
   '["customer_name", "phone", "email", "service_name", "address", "message", "admin_link"]'),

  ('new_lead_admin_sms', 'sms', NULL,
   'New lead! {{customer_name}} wants {{service_name}} at {{address}}. Check admin panel.',
   '["customer_name", "service_name", "address"]')

ON CONFLICT (name) DO NOTHING;

-- Create admin account (phone: 222, bypasses OTP)
INSERT INTO users (role) VALUES ('admin')
ON CONFLICT DO NOTHING;

INSERT INTO contact_methods (user_id, type, value, normalized_value, is_primary, verified_at, bypass_otp)
SELECT 1, 'phone', '222', '222', true, CURRENT_TIMESTAMP, true
WHERE NOT EXISTS (SELECT 1 FROM contact_methods WHERE normalized_value = '222' AND type = 'phone');

-- Create test account (phone: 333, bypasses OTP)
INSERT INTO users (role) VALUES ('customer')
ON CONFLICT DO NOTHING;

INSERT INTO contact_methods (user_id, type, value, normalized_value, is_primary, verified_at, bypass_otp)
SELECT 2, 'phone', '333', '333', true, CURRENT_TIMESTAMP, true
WHERE NOT EXISTS (SELECT 1 FROM contact_methods WHERE normalized_value = '333' AND type = 'phone');
