import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './addTestSuite.css';
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
        <div className="page">
            <div className="add-suite-card card">
                <h1 className="card-title">Create Test Suite</h1>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Description</label>
                        <textarea
                            className="textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>
                    <div className="add-suite-actions">
                        <button type="submit" className="btn btn-primary">Create</button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/test-suites')}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTestSuite;
