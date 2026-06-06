-- FK on-delete policy (Delivery Plan Backend #6 / DB Infra #2)
--
-- Product rule:
--   * test_suite_cases : both FKs CASCADE — удаление suite или case снимает связь.
--   * test_runs.suite_id : SET NULL — прогон сохраняется как исторический артефакт,
--                          даже если исходный suite удалён.
--   * test_run_cases.run_id : CASCADE — удаление прогона удаляет его материализованные кейсы.
--   * test_run_cases.case_id : RESTRICT — нельзя удалить test case, пока он используется
--                              в каком-либо прогоне (защита истории) -> API возвращает 409.

ALTER TABLE test_suite_cases DROP CONSTRAINT IF EXISTS test_suite_cases_suite_id_fkey;
ALTER TABLE test_suite_cases DROP CONSTRAINT IF EXISTS test_suite_cases_case_id_fkey;
ALTER TABLE test_suite_cases
    ADD CONSTRAINT test_suite_cases_suite_id_fkey
        FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE,
    ADD CONSTRAINT test_suite_cases_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE;

ALTER TABLE test_runs DROP CONSTRAINT IF EXISTS test_runs_suite_id_fkey;
ALTER TABLE test_runs
    ADD CONSTRAINT test_runs_suite_id_fkey
        FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE SET NULL;

ALTER TABLE test_run_cases DROP CONSTRAINT IF EXISTS test_run_cases_run_id_fkey;
ALTER TABLE test_run_cases DROP CONSTRAINT IF EXISTS test_run_cases_case_id_fkey;
ALTER TABLE test_run_cases
    ADD CONSTRAINT test_run_cases_run_id_fkey
        FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
    ADD CONSTRAINT test_run_cases_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE RESTRICT;
