import { defineConfig } from 'vitest/config';
import esbuild from 'esbuild';

// Vitest config for unit / component tests.
// CRA (react-scripts) still owns `npm test`; this is the separate
// `npm run test:unit` toolchain for Vitest + Testing Library.
//
// This codebase (CRA-style) keeps JSX inside plain `.js` files. Vitest's
// bundled Vite picks the esbuild loader from the file extension, so `.js` is
// parsed as plain JS and chokes on JSX. This `pre` plugin compiles JSX in our
// source `.js`/`.jsx` files (with React's automatic runtime — no `import React`
// needed) before Vite's import analysis runs.
const jsxInJs = {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
        const file = id.split('?')[0];
        if (!file.includes('/src/') || file.includes('/node_modules/')) return null;
        if (!file.endsWith('.js') && !file.endsWith('.jsx')) return null;
        const result = await esbuild.transform(code, {
            loader: 'jsx',
            jsx: 'automatic',
            sourcefile: file,
            sourcemap: true,
        });
        return { code: result.code, map: result.map };
    },
};

export default defineConfig({
    plugins: [jsxInJs],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        css: false,
        include: ['src/**/*.{test,spec}.{js,jsx}'],
    },
});
