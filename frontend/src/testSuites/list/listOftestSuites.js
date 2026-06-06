import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./listOfTestsSuites.css"
import '../../styles/theme.css'
import { link } from '../../ngrock';

const TestSuitesList = () => {
    const [testSuites, setTestSuites] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${link}/test-suites`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => setTestSuites(data))
            .catch(error => console.error('Error fetching test suites:', error));
    }, []);

    const handleRowClick = (id) => {
        navigate(`/test-suite?id=${id}`);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await fetch(`${link}/test-suite/delete?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setTestSuites(prev => prev.filter(suite => suite.id !== id));
        } catch (error) {
            console.error('Error deleting test suite:', error);
        }
    };

    return (
        <div className="test-suites-list-container">
            <h1>Test Suites</h1>
            {testSuites.length === 0 ? (
                <p>No test suites available</p>
            ) : (
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
            )}
        </div>
    );
};

export default TestSuitesList;
