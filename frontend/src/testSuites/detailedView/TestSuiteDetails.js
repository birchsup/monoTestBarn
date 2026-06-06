import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TestSuiteDetails.css';
import '../../styles/theme.css';
import { link } from "../../ngrock";

const TestSuiteDetails = () => {
    const [testSuite, setTestSuite] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [allTestCases, setAllTestCases] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const { search } = useLocation();
    const navigate = useNavigate();
    const id = new URLSearchParams(search).get('id');
    const apiUrlDetails = `${link}/test-suite?id=${id}`.replace(/([^:]\/)\/+/g, "$1");

    const fetchTestSuiteDetails = async () => {
        try {
            const response = await fetch(apiUrlDetails, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            const data = await response.json();
            setTestSuite(data);
        } catch (error) {
            console.error('Error fetching test suite details:', error);
        }
    };

    useEffect(() => {
        fetchTestSuiteDetails();
    }, [id]);

    useEffect(() => {
        fetch(`${link}/testcases`)
            .then(response => response.json())
            .then(data => setAllTestCases(data))
            .catch(error => console.error('Error fetching all test cases:', error));
    }, []);

    const handleRowClick = (id) => {
        navigate(`/testcases/${id}`);
    };

    const handleDeleteTestCase = async (suiteId, caseId) => {
        try {
            await fetch(`${link}/test-suite/remove-case?suite_id=${suiteId}&case_id=${caseId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
            });
            fetchTestSuiteDetails();
        } catch (error) {
            console.error('Error deleting test case:', error);
        }
    };

    const handleAddTestCase = async (suiteId, caseId) => {
        const payload = { suite_id: suiteId, case_ids: [caseId] };
        const apiUrl = `${link}/test-suites/add-cases`.replace(/([^:]\/)\/+/g, "$1");

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            await fetchTestSuiteDetails();
        } catch (error) {
            console.error('Error adding test case:', error);
        }
    };

    const handleCreateAndAddTestCase = async (suiteId, testCaseName) => {
        try {
            const apiUrl = `${link}/testcases`.replace(/([^:]\/)\/+/g, "$1");
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    test: {
                        name: testCaseName,
                        preconditions: "",
                        priority: "",
                        isAutomated: false,
                        steps: [],
                        created_by: "",
                        created_at: new Date().toISOString().split('T')[0]
                    }
                })
            });

            const newTestCase = await response.json();

            if (!newTestCase || !newTestCase.id) {
                throw new Error("Failed to create test case: Invalid response from server");
            }

            await handleAddTestCase(suiteId, newTestCase.id);
        } catch (error) {
            console.error('Error creating test case:', error);
        }
    };

    if (!testSuite) {
        return <p>Loading...</p>;
    }

    const filteredTestCases = allTestCases.filter(testCase =>
        testCase.test.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="test-suite-details-container">
            <h1>{testSuite.name}</h1>
            <p>{testSuite.description}</p>
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
                    {testSuite.test_cases.map(testCase => (
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
