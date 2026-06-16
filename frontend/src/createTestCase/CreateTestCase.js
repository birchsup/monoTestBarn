import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './createTestCase.css';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import { validateName } from './validateName';
import { apiPost, errorMessage } from '../api/client';

const CreateTestCase = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [testCase, setTestCase] = useState({
        name: '',
        preconditions: '',
        priority: '',
        isAutomated: 'want to automate',
        steps: [
            { step: 1, action: '', expected_result: '' }
        ],
        created_by: ''
    });
    const [nameError, setNameError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'name') {
            setNameError(validateName(value));
        }
        setTestCase((prevTestCase) => ({
            ...prevTestCase,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleStepChange = (index, e) => {
        const { name, value } = e.target;
        const newSteps = testCase.steps.map((step, i) =>
            i === index ? { ...step, [name]: value } : step
        );
        setTestCase((prevTestCase) => ({
            ...prevTestCase,
            steps: newSteps
        }));
    };

    const addStep = () => {
        setTestCase((prevTestCase) => ({
            ...prevTestCase,
            steps: [...prevTestCase.steps, { step: testCase.steps.length + 1, action: '', expected_result: '' }]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validateName(testCase.name);
        if (error) {
            setNameError(error);
            return;
        }
        try {
            await apiPost('/testcases', { test: testCase });
            toast.success('Test case created successfully!');
            navigate('/testcases');
        } catch (err) {
            toast.error(`Failed to create test case: ${errorMessage(err)}`);
        }
    };

    return (
        <div className="page" data-test-id="test-case-container">
            <div className="page-header">
                <h1 className="page-title">New Test Case</h1>
            </div>
            <form onSubmit={handleSubmit} className="create-layout" data-test-id="test-case-form" noValidate>
                <div className="card create-main" data-test-id="test-case-steps">
                    <div className="form-field" data-test-id="form-group-name">
                        <label className="form-label" data-test-id="label-name">Name</label>
                        <input
                            type="text"
                            className={`input${nameError ? ' input-invalid' : ''}`}
                            name="name"
                            value={testCase.name}
                            onChange={handleChange}
                            aria-invalid={nameError ? 'true' : 'false'}
                            data-test-id="input-name"
                        />
                        {nameError && (
                            <p className="field-error" data-test-id="error-name">{nameError}</p>
                        )}
                    </div>
                    <div className="form-field">
                        <label className="form-label" data-test-id="label-preconditions">Preconditions</label>
                        <textarea
                            className="textarea"
                            name="preconditions"
                            value={testCase.preconditions}
                            onChange={handleChange}
                            rows="3"
                            data-test-id="textarea-preconditions"
                        />
                    </div>
                    {testCase.steps.map((step, index) => (
                        <div key={index} className="form-field" data-test-id={`testCase-isStep-${index}`}>
                            <label className="form-label" data-test-id={`label-step-${index}`}>
                                Step {index + 1}
                            </label>
                            <div className="step-row" data-test-id={`step-row-${index}`}>
                                <textarea
                                    className="textarea"
                                    name="action"
                                    placeholder="Action"
                                    value={step.action}
                                    onChange={(e) => handleStepChange(index, e)}
                                    rows="3"
                                    required
                                    data-test-id={`textarea-action-${index}`}
                                />
                                <textarea
                                    className="textarea"
                                    name="expected_result"
                                    placeholder="Expected Result"
                                    value={step.expected_result}
                                    onChange={(e) => handleStepChange(index, e)}
                                    rows="3"
                                    required
                                    data-test-id={`textarea-expectedResult-${index}`}
                                />
                            </div>
                        </div>
                    ))}
                    {/* DEMO marker — screenshot test watches this action row. The
                        "break CSS" demo patch (docs/demo/break-css.patch) shifts/recolors
                        this area so the visual diff is obvious. */}
                    <div className="create-actions" data-test-id="create-actions">
                        <span className="demo-marker" data-test-id="demo-marker">DEMO</span>
                        <button type="button" onClick={addStep} className="btn btn-secondary" data-test-id="button-addStep">
                            Add Step
                        </button>
                        <button type="submit" className="btn btn-primary" data-test-id="button-create">
                            Create
                        </button>
                    </div>
                </div>
                <aside className="card create-sidebar" data-test-id="test-case-detail">
                    <div className="form-field" data-test-id="form-group-priority">
                        <label className="form-label" data-test-id="label-priority">Priority</label>
                        <input
                            type="text"
                            className="input"
                            name="priority"
                            value={testCase.priority}
                            onChange={handleChange}
                            data-test-id="input-priority"
                        />
                    </div>
                    <div className="form-field" data-test-id="form-group-isAutomated">
                        <label className="form-label" data-test-id="label-isAutomated">Is Automated</label>
                        <Select
                            value={testCase.isAutomated}
                            onChange={(value) => setTestCase(prev => ({ ...prev, isAutomated: value }))}
                            options={[
                                { value: 'want to automate', label: 'Want to automate' },
                                { value: "can't be automated", label: "Can't be automated" },
                                { value: 'automated', label: 'Automated' }
                            ]}
                            data-test-id="select-isAutomated"
                        />
                    </div>
                    <div className="form-field" data-test-id="form-group-createdBy">
                        <label className="form-label" data-test-id="label-createdBy">Created By</label>
                        <input
                            type="text"
                            className="input"
                            name="created_by"
                            value={testCase.created_by}
                            onChange={handleChange}
                            required
                            data-test-id="input-createdBy"
                        />
                    </div>
                </aside>
            </form>
        </div>
    );
};

export default CreateTestCase;
