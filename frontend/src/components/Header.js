import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import '../styles/theme.css';
import logo from '../assets/logo.webp'; // Убедитесь, что путь к логотипу правильный

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <header className="app-header"
                data-test-id="app-header">
            <div className="header-logo" onClick={() => navigate('/')}>
                <img src={logo} alt="TestBarn Logo" className="logo-image" />
                TestBarn
            </div>
            <nav className="header-nav">
                <button
                    className={`header-button ${isActive('/testcases') ? 'active' : ''}`}
                    onClick={() => navigate('/testcases')}
                    data-test-id="button-allTests"
                >
                    All Tests
                </button>
                <button
                    className={`header-button ${isActive('/create') ? 'active' : ''}`}
                    onClick={() => navigate('/create')}
                    data-test-id="button-create"
                >
                    Create Test Case
                </button>
                <button
                    className={`header-button ${isActive('/test-suites') ? 'active' : ''}`}
                    onClick={() => navigate('/test-suites')}
                    data-test-id="button-test-suites"
                >
                    List Of Test Suites
                </button>
                <button
                    className={`header-button ${isActive('/test-runs') ? 'active' : ''}`}
                    onClick={() => navigate('/test-runs')}
                    data-test-id="button-createTestRun"
                >
                    Test Runs
                </button>
            </nav>
        </header>
    );
};

export default Header;
