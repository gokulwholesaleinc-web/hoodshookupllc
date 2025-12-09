-- Seed default services
INSERT INTO services (name, description) VALUES
  ('Hood Cleaning', 'Professional kitchen hood and exhaust cleaning'),
  ('Duct Cleaning', 'Commercial duct cleaning services'),
  ('Pressure Washing', 'High-pressure cleaning for exteriors'),
  ('Grease Trap Service', 'Grease trap cleaning and maintenance'),
  ('HVAC Cleaning', 'Heating and cooling system cleaning'),
  ('General Maintenance', 'General property maintenance services')
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
