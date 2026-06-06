import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './TestCaseDetail.css';
import '../styles/theme.css';
import { link } from '../ngrock';

const TestCaseDetail = () => {
    const { id } = useParams();
    const [testCase, setTestCase] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [originalData, setOriginalData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        preconditions: '',
        priority: '',
        isAutomated: false,
        steps: [{ step: 1, action: '', expected_result: '' }],
        created_by: '',
        suite_id: '',
        suite_name: ''
    });
    const [testSuites, setTestSuites] = useState([]);

    useEffect(() => {
        fetch(`${link}/testcase?id=${id}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => {
                setTestCase(data);
                setOriginalData(data);
                setFormData({
                    name: data.test.name,
                    preconditions: data.test.preconditions || '',
                    priority: data.test.priority || '',
                    isAutomated: data.test.isAutomated || false,
                    steps: data.test.steps || [{ step: 1, action: '', expected_result: '' }],
                    created_by: data.test.created_by || '',
                    suite_id: data.suite_id.Int64 || '',
                    suite_name: data.suite_name.String || ''
                });
            })
            .catch(error => console.error('Error fetching test case:', error));

        fetch(`${link}/test-suites`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        })
            .then(response => response.json())
            .then(data => setTestSuites(data))
            .catch(error => console.error('Error fetching test suites:', error));
    }, [id]);

    useEffect(() => {
        if (editMode) {
            const textareas = document.querySelectorAll('.editable-textarea');
            textareas.forEach(textarea => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }
    }, [editMode, formData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleStepChange = (index, e) => {
        const { name, value } = e.target;
        const newSteps = formData.steps.map((step, i) =>
            i === index ? { ...step, [name]: value } : step
        );
        setFormData({ ...formData, steps: newSteps });
    };

    const addStep = () => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            steps: [...prevFormData.steps, { step: prevFormData.steps.length + 1, action: '', expected_result: '' }]
        }));
    };

    const deleteStep = (index) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            steps: prevFormData.steps.filter((step, i) => i !== index)
        }));
    };

    const handleSubmit = () => {
        console.log('Submitting form data:', formData);
        fetch(`${link}/test-case/update?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ test: formData }),
        })
            .then(response => {
                if (response.status === 200) {
                    return null;  // No content to return
                }
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(() => {
                // Повторный запрос для получения обновленных данных тест-кейса
                return fetch(`${link}/testcase?id=${id}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched updated test case data:', data);
                setTestCase(data);
                setOriginalData(data);
                setFormData({
                    name: data.test.name,
                    preconditions: data.test.preconditions || '',
                    priority: data.test.priority || '',
                    isAutomated: data.test.isAutomated || false,
                    steps: data.test.steps || [{ step: 1, action: '', expected_result: '' }],
                    created_by: data.test.created_by || '',
                    suite_id: data.suite_id.Int64 || '',
                    suite_name: data.suite_name.String || ''
                });
                setEditMode(false);
            })
            .catch(error => console.error('Error updating test case:', error));
    };

    const handleCancel = () => {
        setFormData({
            name: originalData.test.name,
            preconditions: originalData.test.preconditions || '',
            priority: originalData.test.priority || '',
            isAutomated: originalData.test.isAutomated || false,
            steps: originalData.test.steps || [{ step: 1, action: '', expected_result: '' }],
            created_by: originalData.test.created_by || '',
            suite_id: originalData.suite_id.Int64 || '',
            suite_name: originalData.suite_name.String || ''
        });
        setEditMode(false);
    };

    const handleAddToSuite = (suiteId) => {
        fetch(`${link}/test-suites/add-cases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ suite_id: parseInt(suiteId, 10), case_ids: [parseInt(id, 10)] }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text(); // Используем text() для обработки пустого ответа
            })
            .then(text => {
                const data = text ? JSON.parse(text) : {};
                console.log('Test case added to suite:', data);
                const suiteName = testSuites.find(suite => suite.id === parseInt(suiteId, 10))?.name || '';
                setFormData(prevFormData => ({
                    ...prevFormData,
                    suite_id: parseInt(suiteId, 10),
                    suite_name: suiteName
                }));
            })
            .catch(error => console.error('Error adding test case to suite:', error));
    };

    if (!testCase) {
        return <p>Loading...</p>;
    }

    return (
        <div className="test-case-container" data-test-id="test-case-container">
            <div className="test-case-detail-view">
                {editMode ? (
                    <>
                        <textarea
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="editable-textarea"
                            rows="1"
                        />
                        <div>
                            <strong data-test-id="preconditions">Preconditions:</strong>
                            <textarea
                                name="preconditions"
                                value={formData.preconditions}
                                onChange={handleInputChange}
                                className="editable-textarea"
                                rows="1"
                                data-test-id="edit-preconditions"
                            />
                        </div>
                        <table className="test-case-table">
                            <thead>
                            <tr>
                                <th>Step Number</th>
                                <th>Action</th>
                                <th>Expected Result</th>
                                <th>Delete</th>
                            </tr>
                            </thead>
                            <tbody>
                            {formData.steps.map((step, index) => (
                                <tr key={index}>
                                    <td>{step.step}</td>
                                    <td>
                                            <textarea
                                                name="action"
                                                value={step.action}
                                                onChange={(e) => handleStepChange(index, e)}
                                                className="editable-textarea"
                                                rows="1"
                                            />
                                    </td>
                                    <td>
                                            <textarea
                                                name="expected_result"
                                                value={step.expected_result}
                                                onChange={(e) => handleStepChange(index, e)}
                                                className="editable-textarea"
                                                rows="1"
                                            />
                                    </td>
                                    <td>
                                        <button type="button" onClick={() => deleteStep(index)} className="button delete-step-button">Delete</button>
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan="4">
                                    <button type="button" onClick={addStep} className="button add-step-button2">Add Step</button>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <button onClick={handleSubmit} className="button button-primary">Save</button>
                        <button onClick={handleCancel} className="button button-secondary">Cancel</button>
                    </>
                ) : (
                    <>
                        <h1 className="test-case-title">{testCase.test.name}</h1>
                        <div><strong>Preconditions:</strong> {testCase.test.preconditions}</div>
                        <table className="test-case-table">
                            <thead>
                            <tr>
                                <th>Step Number</th>
                                <th>Action</th>
                                <th>Expected Result</th>
                            </tr>
                            </thead>
                            <tbody>
                            {testCase.test.steps.map(step => (
                                <tr key={step.step}>
                                    <td>{step.step}</td>
                                    <td>{step.action}</td>
                                    <td>{step.expected_result}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button className="edit-button" data-test-id="edit-button" onClick={() => setEditMode(true)}>Edit</button>
                    </>
                )}
            </div>
            <div className="test-case-meta">
                <div className="meta-item"><strong>Created by:</strong> {testCase.test.created_by}</div>
                <div className="meta-item"><strong>Is automated:</strong> {testCase.test.isAutomated ? 'Yes' : 'No'}
                </div>
                <div className="meta-item"><strong>Priority:</strong> {testCase.test.priority}</div>
                <div className="meta-item">
                    <label><strong>Test Suite:</strong></label>
                    <div className="select-container">
                        {editMode ? (
                            <>
                                <select
                                    name="suite_id"
                                    value={formData.suite_id}
                                    onChange={(e) => handleAddToSuite(e.target.value)}
                                >
                                    <option value="" disabled hidden>Select Test Suite</option>
                                    {testSuites.map(suite => (
                                        <option key={suite.id} value={suite.id}>
                                            {suite.name}
                                        </option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <span>{formData.suite_name || 'None'}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestCaseDetail;
