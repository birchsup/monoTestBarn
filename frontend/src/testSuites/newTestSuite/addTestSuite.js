import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './addTestSuite.css';
import '../../styles/theme.css';

const AddTestSuite = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const requestBody = {
            name,
            description,
        };

        try {
            const response = await fetch('http://localhost:8080/add-test-suite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('Failed to create test suite');
            }

            navigate('/test-suites');
        } catch (error) {
            setError(error.message);
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
