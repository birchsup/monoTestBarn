import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { apiGetList, apiDelete, errorMessage } from '../../api/client';

const PAGE_SIZE = 50;

const TestSuitesList = () => {
    const [testSuites, setTestSuites] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchTestSuites = useCallback(async () => {
        setError('');
        try {
            const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
            if (query) {
                params.set('name', query);
            }
            const { items, total: totalCount } = await apiGetList(`/test-suites?${params}`);
            setTestSuites(items);
            setTotal(totalCount);
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [offset, query]);

    useEffect(() => {
        fetchTestSuites();
    }, [fetchTestSuites]);

    const handleSearch = (e) => {
        e.preventDefault();
        setOffset(0);
        setQuery(search.trim());
    };

    const handleRowClick = (id) => {
        navigate(`/test-suites/${id}`);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this test suite?')) {
            return;
        }
        setError('');
        try {
            await apiDelete(`/test-suites/${id}`);
            setTestSuites(prev => prev.filter(suite => suite.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
        } catch (err) {
            if (err.code === 'test_suite_in_use') {
                setError('This test suite is in use and cannot be deleted.');
            } else {
                setError(errorMessage(err));
            }
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Test Suites</h1>
                <button className="btn btn-primary" onClick={() => navigate('/add-test-suite')}>
                    New Test Suite
                </button>
            </div>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            <form onSubmit={handleSearch} className="toolbar" data-test-id="search-form">
                <input
                    type="text"
                    className="input"
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-test-id="search-input"
                />
                <button type="submit" className="btn btn-secondary" data-test-id="search-button">
                    Search
                </button>
            </form>
            {testSuites.length === 0 ? (
                <div className="empty-state">
                    <p>No test suites available</p>
                    <button className="btn btn-primary" onClick={() => navigate('/add-test-suite')}>
                        Create your first test suite
                    </button>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th className="cell-shrink">ID</th>
                                <th>Name</th>
                                <th className="cell-shrink">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {testSuites.map(testSuite => (
                                <tr
                                    key={testSuite.id}
                                    onClick={() => handleRowClick(testSuite.id)}
                                    className="clickable-row"
                                >
                                    <td className="cell-shrink">{testSuite.id}</td>
                                    <td>{testSuite.name}</td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={(e) => handleDelete(e, testSuite.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr
                                onClick={() => navigate('/add-test-suite')}
                                className="clickable-row action-row"
                            >
                                <td colSpan="3">+ Add New Test Suite</td>
                            </tr>
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

export default TestSuitesList;
