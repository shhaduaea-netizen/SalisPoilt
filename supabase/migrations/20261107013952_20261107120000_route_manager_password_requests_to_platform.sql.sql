/*
# Route company manager password reset requests to platform owners

1. What changes
- Password reset requests raised by company managers (COMPANY_ADMIN) are now stored with target "platform", so only the platform owners see and review them.
- Requests raised by everyone else (employees, branch managers, team leaders) keep target "company" and are reviewed by the company's own managers.

2. Modified table
- password_change_requests: existing rows raised by company managers are updated from target "company" to target "platform".

3. Security
- No table, policy, or grant changes. Access is enforced by the roster server function.

4. Notes
- Idempotent: rows already set to "platform" are not touched.
- Only updates target_role; no rows are deleted and no statuses change.
*/

UPDATE password_change_requests pr
SET target_role = 'platform'
FROM members m
WHERE m.id = pr.member_id
  AND m.role = 'COMPANY_ADMIN'
  AND pr.target_role IS DISTINCT FROM 'platform';
