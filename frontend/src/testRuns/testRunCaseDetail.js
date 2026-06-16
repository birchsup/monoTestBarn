import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import './testRunDetailedView.css';
import '../tetsCaseDetailedView/TestCaseDetail.css';
import StatusBadge, { statusLabel } from '../components/StatusBadge';
import { apiGet, apiPatch, errorMessage } from '../api/client';

const statuses = ['passed', 'failed', 'blocked', 'skipped', 'not_run'];

const formatExecutedAt = (value) => {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleString();
};

const TestRunCaseDetail = () => {
    const { runId, caseId } = useParams();
    const [runCase, setRunCase] = useState(null);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');

    const fetchCase = useCallback(async () => {
        try {
            const data = await apiGet(`/test-runs/${runId}/cases/${caseId}`);
            setRunCase(data);
            setComment(data.comment || '');
        } catch (err) {
            if (err.status === 404) {
                setNotFound(true);
            } else {
                setError(errorMessage(err));
            }
        }
    }, [runId, caseId]);

    useEffect(() => {
        fetchCase();
    }, [fetchCase]);

    // Status and comment share one save path but never clobber each other: the
    // comment is always sent as typed, so grading keeps the note and saving the
    // note keeps the status.
    const save = async (newStatus) => {
        setError('');
        setSaving(true);
        try {
            await apiPatch(`/test-runs/${runId}/cases/${caseId}`, {
                status: newStatus,
                comment
            });
            await fetchCase();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = (newStatus) => save(newStatus);
    // Save the comment on any status (including Not run) without changing it.
    const saveComment = () => save(runCase?.status || 'not_run');

    if (notFound) {
        return (
            <div className="page">
                <div className="empty-state">
                    <p>Test case not found in this run.</p>
                    <Link className="btn btn-secondary" to={`/test-runs/${runId}`}>
                        Back to Test Run
                    </Link>
                </div>
            </div>
        );
    }

    if (!runCase) {
        return (
            <div className="page">
                {error ? <p className="error-message">{error}</p> : <p className="loading">Loading...</p>}
            </div>
        );
    }

    const test = runCase.test || {};
    const runName = runCase.run_details?.name || `Test Run #${runId}`;
    const commentDirty = (runCase.comment || '') !== comment;

    return (
        <div className="page" data-test-id="run-case-container">
            <div className="page-header">
                <div>
                    <p className="page-subtitle">
                        <Link to={`/test-runs/${runId}`}>← {runName}</Link>
                    </p>
                    <h1 className="page-title">{test.name || `Case #${caseId}`}</h1>
                </div>
            </div>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}

            <div className="detail-layout">
                <div className="card detail-main">
                    <p className="detail-preconditions">
                        <span className="form-label">Preconditions</span>
                        {test.preconditions || '—'}
                    </p>
                    <div className="table-container detail-steps">
                        <table className="table">
                            <thead>
                            <tr>
                                <th className="cell-shrink">#</th>
                                <th>Action</th>
                                <th>Expected Result</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(test.steps || []).map(step => (
                                <tr key={step.step}>
                                    <td className="cell-shrink">{step.step}</td>
                                    <td>{step.action}</td>
                                    <td>{step.expected_result}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="detail-actions">
                        <Link className="btn btn-secondary" to={`/testcases/${caseId}`}>
                            Open in Test Cases
                        </Link>
                    </div>
                </div>
                <aside className="card detail-sidebar">
                    <div className="meta-item">
                        <span className="form-label">Status in this run</span>
                        <StatusBadge status={runCase.status} />
                    </div>
                    <div className="meta-item">
                        <span className="form-label">Set status</span>
                        <div className="status-actions">
                            {statuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateStatus(status)}
                                    className={`status-button ${status}`}
                                    disabled={saving || runCase.status === status}
                                >
                                    {statusLabel(status)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="meta-item">
                        <span className="form-label">Comment</span>
                        <textarea
                            className="textarea"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment — independent of the status, save it any time"
                            rows={3}
                            data-test-id="run-case-comment"
                        />
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={saveComment}
                            disabled={!commentDirty || saving}
                            data-test-id="run-case-comment-save"
                        >
                            Save comment
                        </button>
                    </div>
                    <div className="meta-item">
                        <span className="form-label">Executed at</span>
                        <span>{formatExecutedAt(runCase.executed_at)}</span>
                    </div>
                    <div className="meta-item">
                        <span className="form-label">Executed by</span>
                        <span>{runCase.executed_by || '—'}</span>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TestRunCaseDetail;
