import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import "./listOfTestsSuites.css"
import '../../styles/theme.css'
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

    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="test-suites-list-container">
            <h1>Test Suites</h1>
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            <form onSubmit={handleSearch} className="list-toolbar" data-test-id="search-form">
                <input
                    type="text"
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-test-id="search-input"
                />
                <button type="submit" data-test-id="search-button">Search</button>
            </form>
            {testSuites.length === 0 ? (
                <p>No test suites available</p>
            ) : (
                <>
                    <table className="test-suites-list-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {testSuites.map(testSuite => (
                            <tr
                                key={testSuite.id}
                                onClick={() => handleRowClick(testSuite.id)}
                                className="test-suites-list-row"
                            >
                                <td>{testSuite.id}</td>
                                <td>{testSuite.name}</td>
                                <td>
                                    <button
                                        className="btn btn-danger"
                                        onClick={(e) => handleDelete(e, testSuite.id)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr
                            onClick={() => navigate('/add-test-suite')}
                            className="test-suites-list-row placeholder-row"
                        >
                            <td colSpan="3">+ Add New Test Suite</td>
                        </tr>
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

export default TestSuitesList;
