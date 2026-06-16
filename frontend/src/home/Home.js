import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const SECTIONS = [
    {
        title: 'Test Cases',
        description: 'Browse, search and edit individual test cases. Select cases in the list to start an ad-hoc run.',
        path: '/testcases',
        action: 'Open test cases'
    },
    {
        title: 'Test Suites',
        description: 'Group related test cases into suites and launch a test run for a whole suite in one click.',
        path: '/test-suites',
        action: 'Open test suites'
    },
    {
        title: 'Test Runs',
        description: 'Track execution progress, set statuses for each case and review results of finished runs.',
        path: '/test-runs',
        action: 'Open test runs'
    }
];

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">TestBarn</h1>
                    <p className="page-subtitle">A simple home for your test cases, suites and runs.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/create')}>
                    New Test Case
                </button>
            </div>
            <div className="home-grid">
                {SECTIONS.map(section => (
                    <div
                        key={section.path}
                        className="card home-card"
                        onClick={() => navigate(section.path)}
                    >
                        <h2 className="card-title">{section.title}</h2>
                        <p className="home-card-description">{section.description}</p>
                        <span className="home-card-link">{section.action} →</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
