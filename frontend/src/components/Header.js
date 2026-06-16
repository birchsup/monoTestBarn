import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import logo from '../assets/logo.webp';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Section prefix match so detail pages (e.g. /test-runs/2) keep their tab lit.
    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <header className="app-header" data-test-id="app-header">
            <div className="header-logo" onClick={() => navigate('/')}>
                <img src={logo} alt="TestBarn Logo" className="header-logo-image" />
                <span className="header-brand">
                    Test<span className="header-brand-accent">Barn</span>
                </span>
            </div>
            <nav className="header-nav">
                <button
                    className={`nav-link ${isActive('/testcases') ? 'active' : ''}`}
                    onClick={() => navigate('/testcases')}
                    data-test-id="button-allTests"
                >
                    Test Cases
                </button>
                <button
                    className={`nav-link ${isActive('/test-suites') ? 'active' : ''}`}
                    onClick={() => navigate('/test-suites')}
                    data-test-id="button-test-suites"
                >
                    Test Suites
                </button>
                <button
                    className={`nav-link ${isActive('/test-runs') ? 'active' : ''}`}
                    onClick={() => navigate('/test-runs')}
                    data-test-id="button-createTestRun"
                >
                    Test Runs
                </button>
            </nav>
            <button
                className="btn btn-primary btn-sm header-action"
                onClick={() => navigate('/create')}
                data-test-id="button-create"
            >
                New Test Case
            </button>
        </header>
    );
};

export default Header;
