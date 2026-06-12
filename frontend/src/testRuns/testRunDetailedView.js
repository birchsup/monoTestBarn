import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './testRunDetailedView.css';
import '../styles/theme.css';
import StatusChart from '../components/statusChart';
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

    const updateStatus = async (caseId, newStatus) => {
        setError('');
        try {
            // PATCH returns the updated run details with a recalculated summary.
            const updatedRun = await apiPatch(`/test-runs/${id}/cases/${caseId}`, {
                status: newStatus,
                comment: `Status changed to ${newStatus}`
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
            const { results, summary } = await apiPatch(`/test-runs/${id}/cases:batch`, {
                items: selectedCaseIds.map(caseId => ({
                    case_id: caseId,
                    status: bulkStatus,
                    comment: `Status changed to ${bulkStatus}`
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
            <div className="test-run-list-container">
                <p>Test run not found.</p>
            </div>
        );
    }

    if (!run) {
        return error ? <p className="error-message">{error}</p> : <p>Loading...</p>;
    }

    const visibleCases = run.cases.filter(
        c => selectedStatus === 'all' || c.status === selectedStatus
    );

    return (
        <div className="test-run-list-container">
            <h1>{run.run_details?.name || `Test Run Details (ID: ${id})`}</h1>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            <StatusChart summary={run.summary} />

            <div className="filter-container" style={{ marginBottom: '20px' }}>
                <label htmlFor="statusFilter">Filter by Status: </label>
                <select id="statusFilter" onChange={(e) => setSelectedStatus(e.target.value)} value={selectedStatus}>
                    <option value="all">All</option>
                    {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {selectedCaseIds.length > 0 && (
                <div className="bulk-status-container" style={{ marginBottom: '20px' }} data-test-id="bulk-status">
                    <label htmlFor="bulkStatus">Set status for {selectedCaseIds.length} selected: </label>
                    <select id="bulkStatus" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                        {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <button onClick={applyBulkStatus} data-test-id="bulk-status-apply">Apply</button>
                </div>
            )}

            {run.cases.length === 0 ? (
                <p>No test cases available</p>
            ) : (
                <table className="test-run-list-table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectedCaseIds.length === run.cases.length}
                                    onChange={toggleSelectAll}
                                    data-test-id="select-all-checkbox"
                                />
                            </th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Comment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleCases.map(testRunCase => (
                            <tr key={testRunCase.case_id} className="clickable-row">
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedCaseIds.includes(testRunCase.case_id)}
                                        onChange={() => toggleSelected(testRunCase.case_id)}
                                    />
                                </td>
                                <td>{testRunCase.case_id}</td>
                                <td>{caseName(testRunCase)}</td>
                                <td>
                                    <span className={`status-indicator ${testRunCase.status}`}></span>
                                    {testRunCase.status}
                                </td>
                                <td>{testRunCase.comment || ''}</td>
                                <td>
                                    {statuses.map(status => (
                                        <button
                                            key={status}
                                            onClick={() => updateStatus(testRunCase.case_id, status)}
                                            className={`status-button ${status}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TestRunDetailedView;
