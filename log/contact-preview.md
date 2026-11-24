# Local contact preview

Start the existing frontend with `npm ci` (first time) and `npm run dev`, then open:

**http://localhost:5173/dev/contact-preview**

No backend, database, .env or login is required. Use the actual Contacts page, ConDetailView, ContactProperties, AddContactModal, navigation and application shell. The development-only entry dynamically loads a MemoryRouter with the real contacts route, using an in-memory API adapter instead of network requests. It does not create an authentication token, modify localStorage, or persist changes to CRM. Preview sign-out exits to the regular login screen without touching the session.

The top preview bar is testing-only. Select Full contact, Minimal contact, or Long content. Use Slow requests to inspect loading, Fail next write to exercise error states and retry, and Reset data to restore the original fixture. Reloading also resets data. The actual call/task composer, timeline, edit dialog, campaign assignment, contact list/search, contact creation/deletion and opportunities all use the fixture. Other modules are explicitly outside this preview. Email and telephone links retain normal operating-system behavior: do not send messages or place calls; sample addresses/numbers are fictional.

Run `npm run test:contact-preview` for fixture tests and `npm run test:contact-workspace` for existing utility tests. Run `npm run build` and verify that `/dev/contact-preview` on a production build resolves to the regular login fallback; fixture data and preview component must not be included in production assets. No authenticated backend integration, real server persistence, or browser/build validation is implied by fixture tests.

The preview is a developer-only visual acceptance aid, not a substitute for end-to-end validation against the real API before deployment.
