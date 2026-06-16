import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
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

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Test Runs</h1>
            </div>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            {testRuns.length === 0 ? (
                <div className="empty-state">
                    <p>No test runs available</p>
                    <p>Select test cases in the list or open a suite to start a run.</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th className="cell-shrink">ID</th>
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
                                    <td className="cell-shrink">{testRun.id}</td>
                                    <td>{testRun.run_details?.name || 'No details'}</td>
                                    <td>{testRun.suite_id ?? '—'}</td>
                                    <td>{new Date(testRun.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        offset={offset}
                        total={total}
                        pageSize={PAGE_SIZE}
                        onOffsetChange={setOffset}
                    />
                </>
            )}
        </div>
    );
};

export default TestRunsList;
