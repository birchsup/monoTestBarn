import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TestSuiteDetails.css';
import '../../styles/theme.css';
import { apiGet, apiGetList, apiPost, apiPut, apiDelete, errorMessage } from '../../api/client';

const TestSuiteDetails = () => {
    const [testSuite, setTestSuite] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editingInfo, setEditingInfo] = useState(false);
    const [suiteForm, setSuiteForm] = useState({ name: '', description: '' });
    const [allTestCases, setAllTestCases] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const { id } = useParams();
    const navigate = useNavigate();

    const fetchTestSuiteDetails = useCallback(async () => {
        try {
            const data = await apiGet(`/test-suites/${id}`);
            setTestSuite(data);
            setSuiteForm({ name: data.name, description: data.description || '' });
        } catch (err) {
            if (err.status === 404) {
                setNotFound(true);
            } else {
                setError(errorMessage(err));
            }
        }
    }, [id]);

    useEffect(() => {
        fetchTestSuiteDetails();
    }, [fetchTestSuiteDetails]);

    useEffect(() => {
        apiGetList('/testcases')
            .then(({ items }) => setAllTestCases(items))
            .catch(err => console.error('Error fetching all test cases:', err));
    }, []);

    const handleRowClick = (caseId) => {
        navigate(`/testcases/${caseId}`);
    };

    const handleDeleteTestCase = async (suiteId, caseId) => {
        setError('');
        try {
            await apiDelete(`/test-suites/${suiteId}/cases/${caseId}`);
            await fetchTestSuiteDetails();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleAddTestCase = async (suiteId, caseId) => {
        setError('');
        try {
            // :batch is idempotent and keeps existing suite links intact
            // (plain POST /test-suites/{id}/cases has replace semantics).
            const { results } = await apiPost(`/test-suites/${suiteId}/cases:batch`, { case_ids: [caseId] });
            const failed = results.find(r => r.status === 'error');
            if (failed) {
                setError(failed.error.message);
            }
            await fetchTestSuiteDetails();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleCreateAndAddTestCase = async (suiteId, testCaseName) => {
        setError('');
        try {
            const newTestCase = await apiPost('/testcases', {
                test: {
                    name: testCaseName,
                    preconditions: "",
                    priority: "",
                    isAutomated: false,
                    steps: [],
                    created_by: "",
                    created_at: new Date().toISOString().split('T')[0]
                }
            });

            if (!newTestCase || !newTestCase.id) {
                throw new Error("Failed to create test case: Invalid response from server");
            }

            await handleAddTestCase(suiteId, newTestCase.id);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleSaveSuiteInfo = async () => {
        setError('');
        try {
            const updated = await apiPut(`/test-suites/${id}`, suiteForm);
            setTestSuite(prev => ({ ...prev, name: updated.name, description: updated.description }));
            setEditingInfo(false);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleStartRun = async () => {
        setError('');
        try {
            const run = await apiPost('/test-runs', {
                suite_id: parseInt(id, 10),
                run_details: { name: `Run of suite "${testSuite.name}"` }
            });
            navigate(`/test-runs/${run.id}`);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    if (notFound) {
        return (
            <div className="test-suite-details-container">
                <p>Test suite not found.</p>
                <button onClick={() => navigate('/test-suites')}>Back to Test Suites</button>
            </div>
        );
    }

    if (!testSuite) {
        return error ? <p className="error-message">{error}</p> : <p>Loading...</p>;
    }

    const suiteCases = testSuite.test_cases || [];
    const filteredTestCases = allTestCases.filter(testCase =>
        testCase.test.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="test-suite-details-container">
            {error && <p className="error-message" data-test-id="error-message">{error}</p>}
            {editingInfo ? (
                <div className="suite-info-edit" data-test-id="suite-info-edit">
                    <input
                        type="text"
                        value={suiteForm.name}
                        onChange={(e) => setSuiteForm({ ...suiteForm, name: e.target.value })}
                        data-test-id="suite-name-input"
                    />
                    <textarea
                        value={suiteForm.description}
                        onChange={(e) => setSuiteForm({ ...suiteForm, description: e.target.value })}
                        data-test-id="suite-description-input"
                    />
                    <button onClick={handleSaveSuiteInfo} data-test-id="suite-info-save">Save</button>
                    <button onClick={() => {
                        setSuiteForm({ name: testSuite.name, description: testSuite.description || '' });
                        setEditingInfo(false);
                    }}>
                        Cancel
                    </button>
                </div>
            ) : (
                <>
                    <h1>{testSuite.name}</h1>
                    <p>{testSuite.description}</p>
                    <button onClick={() => setEditingInfo(true)} data-test-id="suite-info-edit-button">
                        Edit Suite Info
                    </button>
                </>
            )}
            <button onClick={handleStartRun} data-test-id="start-run-button" disabled={suiteCases.length === 0}>
                Start Test Run
            </button>
            <button onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Done' : 'Edit'}
            </button>
            <table className="test-cases-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        {editMode && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {suiteCases.map(testCase => (
                        <tr
                            key={testCase.id}
                            onClick={() => !editMode && handleRowClick(testCase.id)}
                            className={!editMode ? 'clickable-row' : ''}
                        >
                            <td>{testCase.id}</td>
                            <td>{testCase.test.name}</td>
                            {editMode && (
                                <td>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTestCase(testSuite.id, testCase.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    {editMode && (
                        <tr>
                            <td colSpan="3">
                                <input
                                    type="text"
                                    placeholder="Search or create new test case"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <ul>
                                    {filteredTestCases.map(testCase => (
                                        <li key={testCase.id}>
                                            {testCase.test.name}
                                            <button onClick={() => handleAddTestCase(testSuite.id, testCase.id)}>
                                                Add
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {searchQuery && filteredTestCases.length === 0 && (
                                    <button onClick={() => handleCreateAndAddTestCase(testSuite.id, searchQuery)}>
                                        Create and Add New Test Case
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TestSuiteDetails;
