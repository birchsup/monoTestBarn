import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './listOfCases.css';
import '../styles/theme.css';
import { link } from '../ngrock';

const TestCasesList = () => {
    const [testCases, setTestCases] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${link}/testcases`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => setTestCases(data))
            .catch(error => console.error('Error fetching test cases:', error));
    }, []);

    const handleRowClick = (id) => {
        navigate(`/testcases/${id}`);
    };

    return (
        <div className="test-case-list-container">
            <h1>Test Cases</h1>
            {testCases.length === 0 ? (
                <p>No test cases available</p>
            ) : (
                <table className="test-case-list-table">
                    <thead>
                    <tr>
                        <th>ID</th>
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
                            <td>{testCase.id}</td>
                            <td>{testCase.test.name}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TestCasesList;
