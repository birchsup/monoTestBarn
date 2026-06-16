import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './testRunDetailedView.css';
import StatusBadge, { statusLabel } from '../components/StatusBadge';
import Select from '../components/Select';
import TestRunCasePanel from './TestRunCasePanel';
import { apiGet, apiPatch, errorMessage } from '../api/client';

const statuses = ['passed', 'failed', 'blocked', 'skipped', 'not_run'];

const caseName = (testRunCase) => {
    return testRunCase.test?.name || `Case #${testRunCase.case_id}`;
};

const TestRunDetailedView = () => {
    const { id } = useParams();
    const [run, setRun] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCaseIds, setSelectedCaseIds] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('passed');
    // Case opened in the side panel (null = panel closed).
    const [openCaseId, setOpenCaseId] = useState(null);
    // Expanded (fullscreen-ish) inspector: hides the list, panel takes the width.
    const [expanded, setExpanded] = useState(false);

    const closePanel = () => {
        setOpenCaseId(null);
        setExpanded(false);
    };

    const fetchRun = useCallback(async () => {
        try {
            const data = await apiGet(`/test-runs/${id}`);
            setRun(data);
        } catch (err) {
            if (err.status === 404) {
                setNotFound(true);
            } else {
                setError(errorMessage(err));
            }
        }
    }, [id]);

    useEffect(() => {
        fetchRun();
    }, [fetchRun]);

    const updateStatus = async (caseId, newStatus, currentComment) => {
        setError('');
        try {
            // PATCH returns the updated run details with a recalculated summary.
            // The comment is decoupled from the status: a quick status change keeps
            // the existing comment rather than overwriting it.
            const updatedRun = await apiPatch(`/test-runs/${id}/cases/${caseId}`, {
                status: newStatus,
                comment: currentComment ?? null
            });
            setRun(updatedRun);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const toggleSelected = (caseId) => {
        setSelectedCaseIds(prev =>
            prev.includes(caseId) ? prev.filter(x => x !== caseId) : [...prev, caseId]
        );
    };

    const toggleSelectAll = () => {
        setSelectedCaseIds(prev =>
            prev.length === run.cases.length ? [] : run.cases.map(c => c.case_id)
        );
    };

    const applyBulkStatus = async () => {
        setError('');
        try {
            // Keep each case's existing comment; a bulk status change must not wipe notes.
            const commentByCase = new Map(run.cases.map(c => [c.case_id, c.comment ?? null]));
            const { results, summary } = await apiPatch(`/test-runs/${id}/cases:batch`, {
                items: selectedCaseIds.map(caseId => ({
                    case_id: caseId,
                    status: bulkStatus,
                    comment: commentByCase.get(caseId) ?? null
                }))
            });
            if (summary.failed > 0) {
                const failures = results
                    .filter(r => r.status === 'error')
                    .map(r => `#${r.id}: ${r.error.message}`)
                    .join('; ');
                setError(`Updated ${summary.succeeded} of ${summary.total}. Failed — ${failures}`);
            }
            setSelectedCaseIds([]);
            await fetchRun();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    if (notFound) {
        return (
            <div className="page">
                <div className="empty-state">
                    <p>Test run not found.</p>
                </div>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="page">
                {error ? <p className="error-message">{error}</p> : <p className="loading">Loading...</p>}
            </div>
        );
    }

    const visibleCases = run.cases.filter(
        c => selectedStatus === 'all' || c.status === selectedStatus
    );

    // Prev/Next in the panel walks the currently visible (filtered) cases.
    const orderedIds = visibleCases.map(c => c.case_id);
    const openIndex = orderedIds.indexOf(openCaseId);
    const prevId = openIndex > 0 ? orderedIds[openIndex - 1] : null;
    const nextId =
        openIndex >= 0 && openIndex < orderedIds.length - 1 ? orderedIds[openIndex + 1] : null;

    // Compact progress: how many cases carry a result, and the pass rate.
    const total = run.cases.length;
    const completed = run.cases.filter(c => c.status !== 'not_run').length;
    const passed = run.summary?.passed || 0;
    const passedPct = total ? Math.round((passed / total) * 100) : 0;

    return (
        <div className="page run-page">
            <div className="page-header run-page-header">
                <h1 className="page-title">{run.run_details?.name || `Test Run Details (ID: ${id})`}</h1>
            </div>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}

            {/* Compact, sticky orientation bar. The chips double as status filters,
                so there's a single, obvious way to narrow the list. */}
            <div className="run-summary-bar" data-test-id="run-summary">
                <div className="run-summary-chips" role="group" aria-label="Filter by status">
                    {statuses.map(status => (
                        <button
                            key={status}
                            type="button"
                            className={`summary-chip ${status}${selectedStatus === status ? ' active' : ''}`}
                            aria-pressed={selectedStatus === status}
                            onClick={() => setSelectedStatus(prev => prev === status ? 'all' : status)}
                            title={`Show only ${statusLabel(status)}`}
                        >
                            <span className="summary-chip-label">{statusLabel(status)}</span>
                            <span className="summary-chip-count">{run.summary?.[status] || 0}</span>
                        </button>
                    ))}
                    {selectedStatus !== 'all' && (
                        <button
                            type="button"
                            className="chip-clear"
                            onClick={() => setSelectedStatus('all')}
                        >
                            Show all
                        </button>
                    )}
                </div>
                <div className="run-progress">
                    <div className="run-progress-track">
                        {statuses.filter(s => s !== 'not_run').map(status => {
                            const count = run.summary?.[status] || 0;
                            return count > 0 ? (
                                <div
                                    key={status}
                                    className={`run-progress-seg ${status}`}
                                    style={{ width: `${(count / total) * 100}%` }}
                                    title={`${statusLabel(status)}: ${count}`}
                                />
                            ) : null;
                        })}
                    </div>
                    <span className="run-progress-text">
                        {completed}/{total} completed · {passedPct}% passed
                    </span>
                </div>
            </div>

            {selectedCaseIds.length > 0 && (
                <div className="toolbar bulk-status" data-test-id="bulk-status">
                    <label htmlFor="bulkStatus" className="toolbar-label">
                        Set status for {selectedCaseIds.length} selected
                    </label>
                    <Select
                        id="bulkStatus"
                        size="sm"
                        value={bulkStatus}
                        onChange={setBulkStatus}
                        options={statuses.map(status => ({ value: status, label: statusLabel(status) }))}
                    />
                    <button className="btn btn-primary btn-sm" onClick={applyBulkStatus} data-test-id="bulk-status-apply">
                        Apply
                    </button>
                </div>
            )}

            {run.cases.length === 0 ? (
                <div className="empty-state">
                    <p>No test cases available</p>
                </div>
            ) : (
                <div className={`run-detail-layout${expanded && openCaseId !== null ? ' expanded' : ''}`}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="cell-shrink">
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={selectedCaseIds.length === run.cases.length}
                                            onChange={toggleSelectAll}
                                            data-test-id="select-all-checkbox"
                                        />
                                    </th>
                                    <th className="cell-shrink">ID</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th className="cell-shrink">Set result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleCases.map(testRunCase => (
                                    <tr
                                        key={testRunCase.case_id}
                                        className={openCaseId === testRunCase.case_id ? 'row-active' : ''}
                                    >
                                        <td className="cell-shrink">
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={selectedCaseIds.includes(testRunCase.case_id)}
                                                onChange={() => toggleSelected(testRunCase.case_id)}
                                            />
                                        </td>
                                        <td className="cell-shrink">{testRunCase.case_id}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="link-button"
                                                onClick={() => setOpenCaseId(testRunCase.case_id)}
                                            >
                                                {caseName(testRunCase)}
                                            </button>
                                        </td>
                                        <td>
                                            <StatusBadge status={testRunCase.status} />
                                        </td>
                                        <td className="cell-shrink">
                                            {/* Action control — stays "Change…" rather than echoing the
                                                Status column, so the two columns don't read as a duplicate. */}
                                            <Select
                                                size="sm"
                                                className="change-select"
                                                ariaLabel={`Set result for ${caseName(testRunCase)}`}
                                                value=""
                                                placeholder="Change…"
                                                options={statuses.map(status => ({ value: status, label: statusLabel(status) }))}
                                                onChange={(value) => {
                                                    if (value) {
                                                        updateStatus(testRunCase.case_id, value, testRunCase.comment);
                                                    }
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {openCaseId !== null ? (
                        <TestRunCasePanel
                            key={openCaseId}
                            runId={id}
                            caseId={openCaseId}
                            onClose={closePanel}
                            onPrev={prevId !== null ? () => setOpenCaseId(prevId) : null}
                            onNext={nextId !== null ? () => setOpenCaseId(nextId) : null}
                            onStatusChange={(updatedRun) => setRun(updatedRun)}
                            expanded={expanded}
                            onToggleExpand={() => setExpanded(e => !e)}
                        />
                    ) : (
                        <aside className="run-case-placeholder" data-test-id="run-case-placeholder">
                            <p className="run-case-placeholder-title">No case selected</p>
                            <p>Pick a test case from the list to read its steps and set a result here.</p>
                        </aside>
                    )}
                </div>
            )}
        </div>
    );
};

export default TestRunDetailedView;
