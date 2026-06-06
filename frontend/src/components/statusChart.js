import React from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const statuses = ['pending', 'running', 'passed', 'failed', 'skipped'];
const colors = {
    pending: 'grey',
    running: 'blue',
    passed: 'green',
    failed: 'red',
    skipped: 'orange'
};

const StatusChart = ({ testStatuses }) => {
    // Подсчет количества каждого статуса
    const statusCounts = statuses.reduce((acc, status) => {
        acc[status] = Object.values(testStatuses).filter(s => s === status).length;
        return acc;
    }, {});

    const chartData = {
        labels: statuses,
        datasets: [
            {
                data: Object.values(statusCounts),
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