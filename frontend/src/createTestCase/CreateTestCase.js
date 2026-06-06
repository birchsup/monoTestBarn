import React, { useState } from 'react';
import './createTestCase.css';
import '../styles/theme.css';
import {link} from "../ngrock";

const CreateTestCase = () => {
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
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
    const apiUrl = `${link}/testcases`.replace(/([^:]\/)\/+/g, "$1");

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ id: testCase.id, test: testCase })
        });

        if (response.ok) {
            alert('Test case created successfully!');
            // Clear form or redirect to another page
        } else {
            alert('Failed to create test case.');
        }
    };

    return (
        <div className="test-case-container" data-test-id="test-case-container">
            <form onSubmit={handleSubmit} className="test-case-form" data-test-id="test-case-form">
                <div className="test-case-detail" data-test-id="test-case-detail">
                    <div className="form-group" data-test-id="form-group-priority">
                        <label data-test-id="label-priority">Priority:</label>
                        <input type="text" name="priority" value={testCase.priority} onChange={handleChange} data-test-id="input-priority" />
                    </div>
                    <div className="form-group" data-test-id="form-group-isAutomated">
                        <label data-test-id="label-isAutomated">Is Automated:</label>
                        <select name="isAutomated" value={testCase.isAutomated} onChange={handleChange} data-test-id="select-isAutomated">
                            <option value="want to automate" data-test-id="option-wantToAutomate">Want to automate</option>
                            <option value="can't be automated" data-test-id="option-cantBeAutomated">Can't be automated</option>
                            <option value="automated" data-test-id="option-automated">Automated</option>
                        </select>
                    </div>
                    <div className="form-group" data-test-id="form-group-createdBy">
                        <label data-test-id="label-createdBy">Created By:</label>
                        <input type="text" name="created_by" value={testCase.created_by} onChange={handleChange} required data-test-id="input-createdBy"/>
                    </div>
                </div>
                <div className="test-case-steps" data-test-id="test-case-steps">
                    <div className="form-group" data-test-id="form-group-name">
                        <label data-test-id="label-name">Name:</label>
                        <input type="text" name="name" value={testCase.name} onChange={handleChange} required data-test-id="input-name"/>
                        <label data-test-id="label-preconditions">Preconditions:</label>
                        <textarea name="preconditions" value={testCase.preconditions} onChange={handleChange} rows="3" data-test-id="textarea-preconditions"/>
                    </div>
                    {testCase.steps.map((step, index) => (
                        <div key={index} className="form-group-step" data-test-id={`testCase-isStep-${index}`}>
                            <label data-test-id={`label-step-${index}`}>Step {index + 1}</label>
                            <div className="step-row" data-test-id={`step-row-${index}`}>
                            <textarea className="action-field" name="action" placeholder="Action"
                                      value={step.action} onChange={(e) => handleStepChange(index, e)} rows="3"
                                      required data-test-id={`textarea-action-${index}`}/>
                                <textarea className="result-field" name="expected_result" placeholder="Expected Result"
                                          value={step.expected_result} onChange={(e) => handleStepChange(index, e)}
                                          rows="3" required data-test-id={`textarea-expectedResult-${index}`}/>
                                {index === testCase.steps.length - 1 && (
                                    <button type="button" onClick={addStep} className="add-step-button" data-test-id="button-addStep">Add Step</button>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="submit" className="create-button" data-test-id="button-create">Create</button>
                </div>
            </form>
        </div>
    );
};

export default CreateTestCase;
