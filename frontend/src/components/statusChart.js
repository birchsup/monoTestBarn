import React from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { statusLabel } from './StatusBadge';

const statuses = ['passed', 'failed', 'blocked', 'skipped', 'not_run'];

// Mirrors the --status-* tokens in styles/theme.css (Chart.js needs raw values).
const colors = {
    passed: '#56c46c',
    failed: '#ec6a75',
    blocked: '#a384f5',
    skipped: '#e0a84c',
    not_run: '#6b766e'
};

// summary comes from GET /test-runs/{id}: { passed, failed, blocked, skipped, not_run }.
const StatusChart = ({ summary }) => {
    const chartData = {
        labels: statuses.map(statusLabel),
        datasets: [
            {
                data: statuses.map(status => summary?.[status] || 0),
                backgroundColor: statuses.map(status => colors[status]),
                borderColor: '#141a16',
                borderWidth: 2
            },
        ],
    };

    return (
        <div className="run-summary-chart">
            <Pie
                data={chartData}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
            />
        </div>
    );
};

export default StatusChart;
