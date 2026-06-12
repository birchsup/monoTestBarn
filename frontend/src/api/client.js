import { link } from '../ngrock';

// Backend error body: { code, message, details } (docs/BACKEND_API.md).
export class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message || `Request failed with status ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.code = code || 'unknown_error';
        this.details = details || null;
    }
}

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
};

async function parseBody(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function request(path, { method = 'GET', body, signal } = {}) {
    const response = await fetch(`${link}${path}`, {
        method,
        headers: DEFAULT_HEADERS,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal
    });

    const data = await parseBody(response);

    if (!response.ok) {
        if (data && typeof data === 'object') {
            throw new ApiError(response.status, data.code, data.message, data.details);
        }
        throw new ApiError(response.status, null, typeof data === 'string' ? data : null);
    }

    return { data, response };
}

export async function apiGet(path, options) {
    const { data } = await request(path, options);
    return data;
}

// List endpoints return a JSON array; pagination metadata lives in response headers.
export async function apiGetList(path, options) {
    const { data, response } = await request(path, options);
    return {
        items: Array.isArray(data) ? data : [],
        total: parseInt(response.headers.get('X-Total-Count'), 10) || 0,
        limit: parseInt(response.headers.get('X-Limit'), 10) || 0,
        offset: parseInt(response.headers.get('X-Offset'), 10) || 0
    };
}

export async function apiPost(path, body, options) {
    const { data } = await request(path, { ...options, method: 'POST', body });
    return data;
}

export async function apiPut(path, body, options) {
    const { data } = await request(path, { ...options, method: 'PUT', body });
    return data;
}

export async function apiPatch(path, body, options) {
    const { data } = await request(path, { ...options, method: 'PATCH', body });
    return data;
}

export async function apiDelete(path, body, options) {
    const { data } = await request(path, { ...options, method: 'DELETE', body });
    return data;
}

export function errorMessage(error) {
    if (error instanceof ApiError) {
        return error.message;
    }
    return error?.message || 'Something went wrong';
}
