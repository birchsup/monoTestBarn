import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TestCaseDetail.css';
import '../styles/theme.css';
import { apiGet, apiGetList, apiPut, apiPost, apiDelete, errorMessage } from '../api/client';

// suite_id/suite_name are serialized as sql.Null* objects ({Int64, Valid}/{String, Valid}).
const formStateFrom = (data) => ({
    name: data.test.name,
    preconditions: data.test.preconditions || '',
    priority: data.test.priority || '',
    isAutomated: data.test.isAutomated || false,
    steps: data.test.steps || [{ step: 1, action: '', expected_result: '' }],
    created_by: data.test.created_by || '',
    suite_id: (data.suite_id && data.suite_id.Valid && data.suite_id.Int64) || '',
    suite_name: (data.suite_name && data.suite_name.Valid && data.suite_name.String) || ''
});

const TestCaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [testCase, setTestCase] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
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

    const applyTestCase = useCallback((data) => {
        setTestCase(data);
        setOriginalData(data);
        setFormData(formStateFrom(data));
    }, []);

    useEffect(() => {
        apiGet(`/testcases/${id}`)
            .then(applyTestCase)
            .catch(err => {
                if (err.status === 404) {
                    setNotFound(true);
                } else {
                    setError(errorMessage(err));
                }
            });

        apiGetList('/test-suites')
            .then(({ items }) => setTestSuites(items))
            .catch(err => console.error('Error fetching test suites:', err));
    }, [id, applyTestCase]);

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

    const handleSubmit = async () => {
        setError('');
        try {
            await apiPut(`/testcases/${id}`, { test: formData });
            const data = await apiGet(`/testcases/${id}`);
            applyTestCase(data);
            setEditMode(false);
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleCancel = () => {
        setFormData(formStateFrom(originalData));
        setEditMode(false);
    };

    const handleAddToSuite = async (suiteId) => {
        setError('');
        try {
            // :batch is idempotent and does not unlink the case from other suites
            // (plain POST /test-suites/{id}/cases has replace semantics).
            await apiPost(`/test-suites/${suiteId}/cases:batch`, { case_ids: [parseInt(id, 10)] });
            const suiteName = testSuites.find(suite => suite.id === parseInt(suiteId, 10))?.name || '';
            setFormData(prevFormData => ({
                ...prevFormData,
                suite_id: parseInt(suiteId, 10),
                suite_name: suiteName
            }));
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this test case?')) {
            return;
        }
        setError('');
        try {
            await apiDelete(`/testcases/${id}`);
            navigate('/testcases');
        } catch (err) {
            if (err.code === 'test_case_in_use') {
                setError('This test case is used by one or more test runs and cannot be deleted.');
            } else {
                setError(errorMessage(err));
            }
        }
    };

    if (notFound) {
        return (
            <div className="test-case-container">
                <p>Test case not found.</p>
                <button className="button button-secondary" onClick={() => navigate('/testcases')}>
                    Back to Test Cases
                </button>
            </div>
        );
    }

    if (!testCase) {
        return error ? <p className="error-message">{error}</p> : <p>Loading...</p>;
    }

    return (
        <div className="test-case-container" data-test-id="test-case-container">
            <div className="test-case-detail-view">
                {error && <p className="error-message" data-test-id="error-message">{error}</p>}
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
                            {(testCase.test.steps || []).map(step => (
                                <tr key={step.step}>
                                    <td>{step.step}</td>
                                    <td>{step.action}</td>
                                    <td>{step.expected_result}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button className="edit-button" data-test-id="edit-button" onClick={() => setEditMode(true)}>Edit</button>
                        <button className="button button-secondary" data-test-id="delete-button" onClick={handleDelete}>Delete</button>
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
