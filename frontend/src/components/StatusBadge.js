import React from 'react';

const LABELS = {
    passed: 'Passed',
    failed: 'Failed',
    blocked: 'Blocked',
    skipped: 'Skipped',
    not_run: 'Not run'
};

export const statusLabel = (status) => LABELS[status] || status;

const StatusBadge = ({ status }) => (
    <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
);

export default StatusBadge;
