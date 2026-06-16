// Validation rules for the test case "Name" field.
// Kept as a standalone, side-effect-free module so it can be unit tested in
// isolation and reused by any form that edits a test case name.

export const NAME_MAX_LENGTH = 200;

/**
 * Validate a test case name.
 *
 * Two rules:
 *  1. Required — must contain at least one non-whitespace character.
 *  2. Max length — must be NAME_MAX_LENGTH (200) characters or fewer.
 *
 * @param {string} value raw input value
 * @returns {string} an error message, or '' when the value is valid
 */
export const validateName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'Name is required';
    }
    if (value.length > NAME_MAX_LENGTH) {
        return `Name must be ${NAME_MAX_LENGTH} characters or less`;
    }
    return '';
};
