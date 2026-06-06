import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './testRunDetailedView.css';
import '../styles/theme.css';
import StatusChart from '../components/statusChart';

const statuses = ['pending', 'running', 'passed', 'failed', 'skipped'];

const TestRunDetailedView = () => {
    const { id } = useParams();
    const [testSuites, setTestSuites] = useState({});
    const [testStatuses, setTestStatuses] = useState({});
    const [selectedStatus, setSelectedStatus] = useState('all');

    useEffect(() => {
        fetch(`http://localhost:8080/test-runs/cases?run_id=${id}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => {
                const groupedSuites = data.reduce((acc, testCase) => {
                    if (!acc[testCase.suite_id]) {
                        acc[testCase.suite_id] = [];
                    }
                    acc[testCase.suite_id].push(testCase);
                    return acc;
                }, {});
                setTestSuites(groupedSuites);
                
                const initialStatuses = data.reduce((acc, testCase) => {
                    acc[testCase.id] = testCase.status || 'pending';
                    return acc;
                }, {});
                setTestStatuses(initialStatuses);
            })
            .catch(error => console.error('Error fetching test run details:', error));
    }, [id]);

    const updateStatus = (caseId, newStatus) => {
        fetch(`http://localhost:8080/test-runs/case/status?run_id=${id}&case_id=${caseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ status: newStatus, comment: `Status changed to ${newStatus}` })
        })
            .then(response => response.json())
            .then(() => {
                setTestStatuses(prev => ({ ...prev, [caseId]: newStatus }));
            })
            .catch(error => console.error('Error updating test case status:', error));
    };

    return (
        <div className="test-run-list-container">
            <h1>Test Run Details (ID: {id})</h1>
            <StatusChart testStatuses={testStatuses} />

            <div className="filter-container" style={{ marginBottom: '20px' }}>
                <label htmlFor="statusFilter">Filter by Status: </label>
                <select id="statusFilter" onChange={(e) => setSelectedStatus(e.target.value)} value={selectedStatus}>
                    <option value="all">All</option>
                    {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {Object.keys(testSuites).length === 0 ? (
                <p>No test cases available</p>
            ) : (
                <div className="test-suite-container">
                    {Object.entries(testSuites).map(([suiteId, cases]) => (
                        <div key={suiteId} className="test-suite-block">
                            <h2>Test Suite ID: {suiteId}</h2>
                            <table className="test-run-list-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.filter(testCase => selectedStatus === 'all' || testStatuses[testCase.id] === selectedStatus)
                                        .map(testCase => (
                                            <tr key={testCase.id} className="clickable-row">
                                                <td>{testCase.id}</td>
                                                <td>{testCase.name}</td>
                                                <td>
                                                    <span className={`status-indicator ${testStatuses[testCase.id]}`}></span>
                                                    {testStatuses[testCase.id]}
                                                </td>
                                                <td>
                                                    {statuses.map(status => (
                                                        <button 
                                                            key={status} 
                                                            onClick={() => updateStatus(testCase.id, status)}
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TestRunDetailedView;
