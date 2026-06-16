import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { apiGetList, apiPost, apiDelete, errorMessage } from '../api/client';

const PAGE_SIZE = 50;

const TestCasesList = () => {
    const [testCases, setTestCases] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchTestCases = useCallback(async () => {
        setError('');
        try {
            const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
            if (query) {
                params.set('q', query);
            }
            const { items, total: totalCount } = await apiGetList(`/testcases?${params}`);
            setTestCases(items);
            setTotal(totalCount);
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [offset, query]);

    useEffect(() => {
        fetchTestCases();
    }, [fetchTestCases]);

    const handleSearch = (e) => {
        e.preventDefault();
        setOffset(0);
        setQuery(search.trim());
    };

    const handleRowClick = (id) => {
        navigate(`/testcases/${id}`);
    };

    const toggleSelected = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds(prev =>
            prev.length === testCases.length ? [] : testCases.map(tc => tc.id)
        );
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} test case(s)?`)) {
            return;
        }
        setError('');
        try {
            const { results, summary } = await apiDelete('/testcases:batch', { ids: selectedIds });
            if (summary.failed > 0) {
                const failures = results
                    .filter(r => r.status === 'error')
                    .map(r => `#${r.id}: ${r.error.message}`)
                    .join('; ');
                setError(`Deleted ${summary.succeeded} of ${summary.total}. Failed — ${failures}`);
            }
            setSelectedIds([]);
            await fetchTestCases();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleRunSelected = async () => {
        setError('');
        try {
            const run = await apiPost('/test-runs', {
                test_case_ids: selectedIds,
                run_details: { name: `Run of ${selectedIds.length} selected case(s)` }
            });
            navigate(`/test-runs/${run.id}`);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Test Cases</h1>
                <button className="btn btn-primary" onClick={() => navigate('/create')}>
                    New Test Case
                </button>
            </div>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            <form onSubmit={handleSearch} className="toolbar" data-test-id="search-form">
                <input
                    type="text"
                    className="input"
                    placeholder="Search test cases"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-test-id="search-input"
                />
                <button type="submit" className="btn btn-secondary" data-test-id="search-button">
                    Search
                </button>
                {selectedIds.length > 0 && (
                    <>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleRunSelected}
                            data-test-id="run-selected-button"
                        >
                            Start Run ({selectedIds.length})
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleDeleteSelected}
                            data-test-id="delete-selected-button"
                        >
                            Delete ({selectedIds.length})
                        </button>
                    </>
                )}
            </form>
            {testCases.length === 0 ? (
                <div className="empty-state">
                    <p>No test cases available</p>
                    <button className="btn btn-primary" onClick={() => navigate('/create')}>
                        Create your first test case
                    </button>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th className="cell-shrink">
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={selectedIds.length === testCases.length && testCases.length > 0}
                                        onChange={toggleSelectAll}
                                        data-test-id="select-all-checkbox"
                                    />
                                </th>
                                <th className="cell-shrink">ID</th>
                                <th>Title</th>
                            </tr>
                            </thead>
                            <tbody>
                            {testCases.map(testCase => (
                                <tr
                                    key={testCase.id}
                                    onClick={() => handleRowClick(testCase.id)}
                                    className="clickable-row"
                                >
                                    <td className="cell-shrink" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={selectedIds.includes(testCase.id)}
                                            onChange={() => toggleSelected(testCase.id)}
                                        />
                                    </td>
                                    <td className="cell-shrink">{testCase.id}</td>
                                    <td>{testCase.test.name}</td>
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

export default TestCasesList;
