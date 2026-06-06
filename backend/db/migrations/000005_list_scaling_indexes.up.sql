-- Indexes to keep list endpoints (pagination/filter/sort) cheap at scale
-- (Delivery Plan Backend #7 / DB Infra #3).

CREATE INDEX IF NOT EXISTS idx_test_suites_name ON test_suites (name);
CREATE INDEX IF NOT EXISTS idx_test_suites_created_at ON test_suites (created_at);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite_id ON test_runs (suite_id);
