import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge, { statusLabel } from '../components/StatusBadge';
import { apiGet, apiPatch, errorMessage } from '../api/client';

const primaryStatuses = ['passed', 'failed', 'blocked', 'skipped'];

const formatExecutedAt = (value) => {
    if (!value) {
        return null;
    }
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

// Tester's inspector for a single case within a test run. Built as a work area:
// sticky header (context) + a prominent result block right under it (status +
// comment, always editable) + scrolling test-case content below.
const TestRunCasePanel = ({
    runId, caseId, onClose, onPrev, onNext, onStatusChange, expanded, onToggleExpand
}) => {
    const [runCase, setRunCase] = useState(null);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [doneSteps, setDoneSteps] = useState(() => new Set());
    const [precCollapsed, setPrecCollapsed] = useState(true);
    const [precOverflows, setPrecOverflows] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const precRef = useRef(null);

    const fetchCase = useCallback(async () => {
        setError('');
        setNotFound(false);
        setRunCase(null);
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

    // Decide whether the preconditions block needs a "Show more" toggle. Only
    // measure while collapsed (the clamp is active); re-check when the width
    // changes (expand/collapse) so a block that now fits drops the toggle.
    useLayoutEffect(() => {
        const el = precRef.current;
        if (el && precCollapsed) {
            setPrecOverflows(el.scrollHeight > el.clientHeight + 2);
        }
    }, [runCase, expanded, precCollapsed]);

    // Single save path. The comment is always sent as-is alongside the status,
    // so status and comment never clobber each other: grading carries the
    // current note along, and saving a note keeps the current status.
    const save = useCallback(async (newStatus) => {
        setError('');
        setSaving(true);
        try {
            const updatedRun = await apiPatch(`/test-runs/${runId}/cases/${caseId}`, {
                status: newStatus,
                comment
            });
            await fetchCase();
            if (onStatusChange) {
                onStatusChange(updatedRun);
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }, [runId, caseId, comment, fetchCase, onStatusChange]);

    // Set the result; carries whatever is currently typed in the comment.
    const setResult = (newStatus) => save(newStatus);

    // Save the comment without touching the status — works on any status,
    // including "Not run", so a note can be attached at any moment.
    const saveComment = () => save(runCase?.status || 'not_run');

    const toggleStep = (stepNo) => {
        setDoneSteps(prev => {
            const next = new Set(prev);
            if (next.has(stepNo)) {
                next.delete(stepNo);
            } else {
                next.add(stepNo);
            }
            return next;
        });
    };

    const test = runCase?.test || {};
    const status = runCase?.status;
    const steps = test.steps || [];
    const commentDirty = (runCase?.comment || '') !== comment;

    return (
        <aside className="card run-case-panel" data-test-id="run-case-panel">
            <header className="rc-header">
                <div className="rc-header-top">
                    <div className="rc-nav-group">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm rc-nav-btn"
                            onClick={onPrev}
                            disabled={!onPrev}
                            aria-label="Previous case"
                        >
                            ‹ Prev
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm rc-nav-btn"
                            onClick={onNext}
                            disabled={!onNext}
                            aria-label="Next case"
                        >
                            Next ›
                        </button>
                    </div>
                    <div className="rc-header-actions">
                        <button
                            type="button"
                            className="rc-icon-btn"
                            onClick={onToggleExpand}
                            aria-pressed={expanded}
                            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
                            title={expanded ? 'Collapse' : 'Expand'}
                        >
                            {expanded ? '⤡' : '⤢'}
                        </button>
                        <button
                            type="button"
                            className="rc-icon-btn"
                            onClick={onClose}
                            aria-label="Close case details"
                            data-test-id="run-case-panel-close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <h2 className="rc-title" title={test.name || `Case #${caseId}`}>
                    {runCase ? (test.name || `Case #${caseId}`) : `Case #${caseId}`}
                </h2>
                <div className="rc-meta-row">
                    <span className="rc-case-id">TC-{caseId}</span>
                    {runCase && <StatusBadge status={status} />}
                    {runCase && (
                        <Link className="rc-open-link" to={`/testcases/${caseId}`}>
                            Open in Test Cases →
                        </Link>
                    )}
                </div>
                {runCase && (
                    <div className="rc-header-meta">
                        <span className="rc-header-meta-item">
                            <span className="rc-header-meta-label">Executed at</span>
                            <span className={formatExecutedAt(runCase.executed_at) ? '' : 'rc-meta-empty'}>
                                {formatExecutedAt(runCase.executed_at) || 'Not recorded'}
                            </span>
                        </span>
                        <span className="rc-header-meta-item">
                            <span className="rc-header-meta-label">Executed by</span>
                            <span className={runCase.executed_by ? '' : 'rc-meta-empty'}>
                                {runCase.executed_by || 'Not recorded'}
                            </span>
                        </span>
                    </div>
                )}
            </header>

            {error && <p className="error-message" data-test-id="error-message">{error}</p>}

            {notFound ? (
                <p className="empty-state">Test case not found in this run.</p>
            ) : !runCase ? (
                <p className="loading">Loading...</p>
            ) : (
                <>
                    <div className="rc-body">
                        <section className="rc-section">
                            <div className="rc-section-head">
                                <h3 className="rc-section-title">Preconditions</h3>
                                {precOverflows && (
                                    <button
                                        type="button"
                                        className="rc-edit"
                                        onClick={() => setPrecCollapsed(c => !c)}
                                    >
                                        {precCollapsed ? 'Show more' : 'Show less'}
                                    </button>
                                )}
                            </div>
                            <p
                                ref={precRef}
                                className={`rc-prec${precCollapsed ? ' collapsed' : ''}`}
                            >
                                {test.preconditions || '—'}
                            </p>
                        </section>

                        <section className="rc-section rc-steps-section">
                            <h3 className="rc-section-title rc-steps-title">Steps</h3>
                            {steps.length === 0 ? (
                                <p className="rc-steps-empty">No steps</p>
                            ) : (
                                <ol className="rc-steps-list">
                                    {steps.map(step => (
                                        <li
                                            key={step.step}
                                            className={`rc-step${doneSteps.has(step.step) ? ' done' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox rc-step-check"
                                                checked={doneSteps.has(step.step)}
                                                onChange={() => toggleStep(step.step)}
                                                aria-label={`Mark step ${step.step} done`}
                                            />
                                            <span className="rc-step-num">{step.step}</span>
                                            <div className="rc-step-content">
                                                <div className="rc-step-field">
                                                    <span className="rc-step-label">Action</span>
                                                    <p className="rc-step-text">{step.action}</p>
                                                </div>
                                                <div className="rc-step-field">
                                                    <span className="rc-step-label">Expected result</span>
                                                    <p className="rc-step-text">{step.expected_result}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        {/* Result block — right under the last step, so the result is
                            graded after reading through the steps. */}
                        <section className="rc-section rc-result" data-test-id="rc-result">
                            <div className="rc-result-head">
                                <h3 className="rc-section-title">Result in this run</h3>
                                {status !== 'not_run' && (
                                    <button
                                        type="button"
                                        className="rc-reset"
                                        onClick={() => setResult('not_run')}
                                        disabled={saving}
                                    >
                                        Reset to “{statusLabel('not_run')}”
                                    </button>
                                )}
                            </div>
                            <div className="rc-seg" role="group" aria-label="Set result">
                                {primaryStatuses.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setResult(s)}
                                        className={`rc-seg-btn ${s}${status === s ? ' active' : ''}`}
                                        aria-pressed={status === s}
                                        disabled={saving}
                                    >
                                        {statusLabel(s)}
                                    </button>
                                ))}
                            </div>
                            <div className="rc-comment-row">
                                <textarea
                                    className="textarea rc-comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add a comment — independent of the status, save it any time"
                                    rows={2}
                                    data-test-id="rc-comment"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm rc-comment-save"
                                    onClick={saveComment}
                                    disabled={!commentDirty || saving}
                                    data-test-id="rc-comment-save"
                                >
                                    Save
                                </button>
                            </div>
                        </section>
                    </div>
                </>
            )}
        </aside>
    );
};

export default TestRunCasePanel;
