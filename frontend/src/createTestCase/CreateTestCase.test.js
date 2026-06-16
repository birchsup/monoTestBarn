import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NAME_MAX_LENGTH } from './validateName';
import CreateTestCase from './CreateTestCase';
import { ToastProvider } from '../components/Toast';

// --- Mocks ---------------------------------------------------------------

// Capture navigation without a real router history.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the shared API client so no real network call is made.
const mockApiPost = vi.fn();
vi.mock('../api/client', () => ({
    apiPost: (...args) => mockApiPost(...args),
    errorMessage: (err) => err?.message || 'Something went wrong',
}));



function renderForm() {
    return render(
        <MemoryRouter>
            <ToastProvider>
                <CreateTestCase />
            </ToastProvider>
        </MemoryRouter>
    );
}

beforeEach(() => {
    mockNavigate.mockReset();
    mockApiPost.mockReset();
    mockApiPost.mockResolvedValue({ id: 1 });
});

describe('CreateTestCase — name validation in the UI', () => {
    it('shows the "required" error on submit with an empty name and does not call the API', async () => {
        renderForm();

        fireEvent.click(screen.getByTestId('button-create'));

        expect(await screen.findByTestId('error-name')).toHaveTextContent('Name is required');
        expect(mockApiPost).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows the max-length error live when typing more than the limit', () => {
        renderForm();

        const input = screen.getByTestId('input-name');
        fireEvent.change(input, { target: { value: 'x'.repeat(NAME_MAX_LENGTH + 1) } });

        expect(screen.getByTestId('error-name')).toHaveTextContent(
            `Name must be ${NAME_MAX_LENGTH} characters or less`
        );
    });

    it('clears a previous error once the name becomes valid', () => {
        renderForm();
        const input = screen.getByTestId('input-name');

        fireEvent.change(input, { target: { value: '   ' } });
        expect(screen.getByTestId('error-name')).toHaveTextContent('Name is required');

        fireEvent.change(input, { target: { value: 'Login Test' } });
        expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
    });

    it('submits, posts the test case, and redirects to the list when the name is valid', async () => {
        renderForm();

        fireEvent.change(screen.getByTestId('input-name'), {
            target: { value: 'Login Test' },
        });
        fireEvent.click(screen.getByTestId('button-create'));

        await waitFor(() => expect(mockApiPost).toHaveBeenCalledTimes(1));

        expect(mockApiPost).toHaveBeenCalledWith(
            '/testcases',
            expect.objectContaining({
                test: expect.objectContaining({ name: 'Login Test' }),
            })
        );
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/testcases'));
        expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
    });

    it('does not redirect and surfaces an error toast when the API fails', async () => {
        mockApiPost.mockRejectedValue(new Error('Boom'));
        renderForm();

        fireEvent.change(screen.getByTestId('input-name'), {
            target: { value: 'Login Test' },
        });
        fireEvent.click(screen.getByTestId('button-create'));

        expect(await screen.findByTestId('toast-error')).toHaveTextContent(
            'Failed to create test case: Boom'
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
