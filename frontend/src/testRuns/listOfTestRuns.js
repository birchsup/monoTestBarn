import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './testRunsList.css';
import '../styles/theme.css';
import { link } from '../ngrock';

const TestRunsList = () => {
    const [testRuns, setTestRuns] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${link}/test-runs`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => setTestRuns(data))
            .catch(error => console.error('Error fetching test runs:', error));
    }, []);

   const handleRowClick = (id) => {
    navigate(`/test-runs/${id}`);
};

    return (
        <div className="test-run-list-container">
            <h1>Test Runs</h1>
            {testRuns.length === 0 ? (
                <p>No test runs available</p>
            ) : (
                <table className="test-run-list-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Details</th>
                        <th>Created At</th>
                    </tr>
                    </thead>
                    <tbody>
                    {testRuns.map(testRun => (
                        <tr
                            key={testRun.id}
                            onClick={() => handleRowClick(testRun.id)}
                            className="clickable-row"
                        >
                            <td>{testRun.id}</td>
                            <td>{testRun.details || 'No details'}</td>
                            <td>{new Date(testRun.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TestRunsList;
