import React from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const statuses = ['passed', 'failed', 'blocked', 'skipped', 'not_run'];
const colors = {
    passed: 'green',
    failed: 'red',
    blocked: 'purple',
    skipped: 'orange',
    not_run: 'grey'
};

// summary comes from GET /test-runs/{id}: { passed, failed, blocked, skipped, not_run }.
const StatusChart = ({ summary }) => {
    const chartData = {
        labels: statuses,
        datasets: [
            {
                data: statuses.map(status => summary?.[status] || 0),
                backgroundColor: statuses.map(status => colors[status]),
            },
        ],
    };

    return (
        <div className="chart-container" style={{ width: '450px', height: '450px',  textAlign: 'left', marginBottom: '20px' }}>
            <Pie data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
    );
};

export default StatusChart;
