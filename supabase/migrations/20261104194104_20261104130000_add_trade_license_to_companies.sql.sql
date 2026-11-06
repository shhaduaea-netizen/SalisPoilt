/*
# Add trade license column to companies

1. Changes
- Adds `trade_license` (text, nullable) to `companies`.
- Stores the UAE trade license number for each company.

2. Security
- No policy changes. The column is only read/written by the service role (edge functions).

3. Notes
- Nullable so existing companies are not affected.
- Idempotent: safe to re-run.
*/
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_license text;
