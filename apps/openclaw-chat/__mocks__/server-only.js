// Mock for 'server-only' package in test environment
// The real server-only throws an error when imported in non-server contexts.
// Our test runs in Node environment (not Next.js server), so we provide a no-op mock.
module.exports = {};
