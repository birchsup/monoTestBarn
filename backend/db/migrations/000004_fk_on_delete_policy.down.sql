-- Revert FK on-delete policy back to the implicit (NO ACTION) behaviour.

ALTER TABLE test_run_cases DROP CONSTRAINT IF EXISTS test_run_cases_run_id_fkey;
ALTER TABLE test_run_cases DROP CONSTRAINT IF EXISTS test_run_cases_case_id_fkey;
ALTER TABLE test_run_cases
    ADD CONSTRAINT test_run_cases_run_id_fkey
        FOREIGN KEY (run_id) REFERENCES test_runs(id),
    ADD CONSTRAINT test_run_cases_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES test_cases(id);

ALTER TABLE test_runs DROP CONSTRAINT IF EXISTS test_runs_suite_id_fkey;
ALTER TABLE test_runs
    ADD CONSTRAINT test_runs_suite_id_fkey
        FOREIGN KEY (suite_id) REFERENCES test_suites(id);

ALTER TABLE test_suite_cases DROP CONSTRAINT IF EXISTS test_suite_cases_suite_id_fkey;
ALTER TABLE test_suite_cases DROP CONSTRAINT IF EXISTS test_suite_cases_case_id_fkey;
ALTER TABLE test_suite_cases
    ADD CONSTRAINT test_suite_cases_suite_id_fkey
        FOREIGN KEY (suite_id) REFERENCES test_suites(id),
    ADD CONSTRAINT test_suite_cases_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES test_cases(id);
