import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './testRunsList.css';
import '../styles/theme.css';
import { apiGetList, errorMessage } from '../api/client';

const PAGE_SIZE = 50;

const TestRunsList = () => {
    const [testRuns, setTestRuns] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchTestRuns = useCallback(async () => {
        setError('');
        try {
            const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
            const { items, total: totalCount } = await apiGetList(`/test-runs?${params}`);
            setTestRuns(items);
            setTotal(totalCount);
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [offset]);

    useEffect(() => {
        fetchTestRuns();
    }, [fetchTestRuns]);

    const handleRowClick = (id) => {
        navigate(`/test-runs/${id}`);
    };

    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="test-run-list-container">
            <h1>Test Runs</h1>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            {testRuns.length === 0 ? (
                <p>No test runs available</p>
            ) : (
                <>
                    <table className="test-run-list-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Suite</th>
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
                                <td>{testRun.run_details?.name || 'No details'}</td>
                                <td>{testRun.suite_id ?? '—'}</td>
                                <td>{new Date(testRun.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <div className="list-pagination" data-test-id="pagination">
                        <button
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                        >
                            Previous
                        </button>
                        <span>Page {page} of {totalPages} ({total} total)</span>
                        <button
                            disabled={offset + PAGE_SIZE >= total}
                            onClick={() => setOffset(offset + PAGE_SIZE)}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TestRunsList;
