import { describe, it, expect } from 'vitest';
import { validateName, NAME_MAX_LENGTH } from './validateName';

describe('validateName', () => {
    // ---- Rule 1: required ----
    describe('required rule', () => {
        it('returns an error for an empty string', () => {
            expect(validateName('')).toBe('Name is required');
        });

        it('returns an error for a whitespace-only string', () => {
            expect(validateName('   ')).toBe('Name is required');
            expect(validateName('\t\n  ')).toBe('Name is required');
        });

        it('passes when there is at least one non-whitespace character', () => {
            expect(validateName('a')).toBe('');
            expect(validateName('  Login test  ')).toBe('');
        });
    });

    // ---- Rule 2: max length (NAME_MAX_LENGTH = 200) ----
    describe('max length rule', () => {
        const expectedMessage = `Name must be ${NAME_MAX_LENGTH} characters or less`;

        it('passes at exactly the limit', () => {
            const atLimit = 'x'.repeat(NAME_MAX_LENGTH);
            expect(atLimit).toHaveLength(NAME_MAX_LENGTH);
            expect(validateName(atLimit)).toBe('');
        });

        it('fails one character over the limit', () => {
            const overLimit = 'x'.repeat(NAME_MAX_LENGTH + 1);
            expect(validateName(overLimit)).toBe(expectedMessage);
        });

        it('measures raw length, not the trimmed length', () => {
            // 199 visible chars + 2 surrounding spaces = 201 raw chars.
            const withSpaces = ` ${'x'.repeat(NAME_MAX_LENGTH - 1)} `;
            expect(withSpaces).toHaveLength(NAME_MAX_LENGTH + 1);
            expect(validateName(withSpaces)).toBe(expectedMessage);
        });
    });

    // ---- Rule precedence ----
    it('reports "required" before "too long" when the value is blank', () => {
        // A whitespace-only string longer than the limit is still "required"
        // first, because the required check runs before the length check.
        const longBlank = ' '.repeat(NAME_MAX_LENGTH + 5);
        expect(validateName(longBlank)).toBe('Name is required');
    });

    it('returns an empty string (no error) for a typical valid name', () => {
        expect(validateName('Login Test')).toBe('');
    });
});
