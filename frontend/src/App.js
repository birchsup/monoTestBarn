import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './home/Home';
import TestCasesList from './listOfCases/TestCasesList';
import TestCaseDetail from './tetsCaseDetailedView/TestCaseDetail';
import CreateTestCase from './createTestCase/CreateTestCase';
import Header from './components/Header';
import TestSuitesList from './testSuites/list/listOftestSuites';
import TestSuiteDetails from './testSuites/detailedView/TestSuiteDetails';
import TestRunsList from './testRuns/listOfTestRuns';
import TestRunDetailedView from './testRuns/testRunDetailedView';
import TestRunCaseDetail from './testRuns/testRunCaseDetail';
import AddTestSuite from './testSuites/newTestSuite/addTestSuite';
import { ToastProvider } from './components/Toast';

function App() {
    return (
        <Router>
            <ToastProvider>
                <div className="app">
                    <Header />
                    <main>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/testcases" element={<TestCasesList />} />
                            <Route path="/testcases/:id" element={<TestCaseDetail />} />
                            <Route path="/create" element={<CreateTestCase />} />
                            <Route path="/test-suites" element={<TestSuitesList />} />
                            <Route path="/test-suites/:id" element={<TestSuiteDetails />} />
                            <Route path="/test-runs" element={<TestRunsList />} />
                            <Route path="/test-runs/:id" element={<TestRunDetailedView />} />
                            <Route path="/test-runs/:runId/cases/:caseId" element={<TestRunCaseDetail />} />
                            <Route path="/add-test-suite" element={<AddTestSuite />} />
                        </Routes>
                    </main>
                </div>
            </ToastProvider>
        </Router>
    );
}

export default App;
