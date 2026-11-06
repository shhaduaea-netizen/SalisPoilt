/*
# Add temp_password column to members

1. Changes
- Adds `temp_password` (text, nullable) to `members`.
- Stores the initial password from the Excel import so a manager can reset
  an employee's password directly without sending an email link.
- The column is cleared when the employee changes their own password.

2. Security
- No new policies needed. The column is only read/written by the service role
  (edge functions). It is never exposed to the anon key.
*/

ALTER TABLE members ADD COLUMN IF NOT EXISTS temp_password text;
