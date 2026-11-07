/*
# Add browser-bound approved password reset

1. Changed tables
- `password_change_requests`
  - `reset_token_hash` (text, nullable): SHA-256 hash of the secret token given to the browser that created the request. The raw token is never stored.
  - `completed_at` (timestamptz, nullable): when the employee finished setting the new password.

2. Security
- No policies or grants change. The roster server function uses the service role and enforces ownership of every request.
- The hash lets the server match a request to the browser that started it without relying on the email address.

3. Notes
- Existing rows keep their values; the new columns are empty for them.
- Re-running this migration is safe.
*/

ALTER TABLE password_change_requests ADD COLUMN IF NOT EXISTS reset_token_hash text;
ALTER TABLE password_change_requests ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS password_change_requests_reset_token_hash_idx
  ON password_change_requests (reset_token_hash);
