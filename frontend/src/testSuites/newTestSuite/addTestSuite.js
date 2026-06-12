import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './addTestSuite.css';
import '../../styles/theme.css';
import { apiPost, errorMessage } from '../../api/client';

const AddTestSuite = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await apiPost('/test-suites', { name, description });
            navigate('/test-suites');
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    return (
        <div className="add-test-suite-container">
            <h1>Create Test Suite</h1>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="test-suite-form">
                <label>
                    Name:
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </label>
                <label>
                    Description:
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </label>
                <button type="submit">Create</button>
            </form>
        </div>
    );
};

export default AddTestSuite;
