# Contact workspace verification

**Branch:** feat/contact-workspace-redesign  
**Scope:** frontend only; no database migration or API contract changes.  
**Status:** implementation committed for local review; full browser/build validation pending.

## Local commands (PowerShell)

Run from the existing fork clone. Make sure the worktree is clean first.

```powershell
git status --short
git fetch origin feat/contact-workspace-redesign
git switch --track origin/feat/contact-workspace-redesign
cd frontend
npm ci
npm run test:contact-workspace
npm run build
npm run lint
npm run dev
```

If the branch already exists locally, replace the switch line with:

```powershell
git switch feat/contact-workspace-redesign
git pull --ff-only origin feat/contact-workspace-redesign
```

Confirm origin points to ThunderKhan/crm-vsph (git remote -v). If it does not, fetch from the fork explicitly. Preserve existing frontend/.env and backend/.env; VITE_API_URL must point to a working API. See [RUN.md](../RUN.md) for local startup. Avoid destructive database setup commands on any shared database. Start the existing backend in a separate terminal if testing against a local API.

## Manual browser checks (use a disposable/test contact)

| Area | Check |
| --- | --- |
| Routing | Open from contact list and global search; reload URL; change contact ID; return to list; check list refresh after edit/delete. |
| Layout | 1440x900, 1280x720, 768x1024, 390x844 and 320px width; all controls and fields reachable; no nested primary panel scroll or horizontal overflow. |
| Identity | Name, record ID, actual status, owner; missing mobile/account and long values render clearly. |
| Properties | Expand/collapse every group, inspect all original fields, use email/phone/account/profile links and copy actions; invalid profile links are not executable. |
| Composer | Open via header and quick actions; switch call/task/email modes and collapse/reopen; drafts persist within the same contact; navigate to another contact and verify no draft leakage. |
| Calls/tasks | Submit valid and invalid values; network failure retains form; rapid clicks do not duplicate; real confirmed record appears in history; task date is local-time correct. |
| Email | Inspect external mail client recipient/subject/body; no claim of delivery or email activity event. Missing email cannot submit. |
| Timeline | All activity default; calls/tasks filter independently; confirm notes, real timestamps, priority, status and due dates; verify pagination and retry on failure. |
| Edit/campaign/delete | Existing contact edit persists; campaign options load with permission; select a disposable record's campaign and verify assignment; delete confirmation, cancel and failure paths. Never delete real data during tests. |
| Permissions | Admin and limited employee: actions hidden or unavailable as appropriate; backend still enforces existing rules. |
| Accessibility | Tab/Shift+Tab, Escape, ArrowUp/Down on menu, focus restoration, native dialog focus containment, 44px targets and visible focus, screen reader labels and status messages. |
| Motion | Inspect press/release, menu anchoring, composer/accordion expansion and dialog entry; rapid interruptions do not trap focus; emulate reduced-motion and touch; no animation on tab navigation. |
| Branding | Actual existing VSPH navigation artwork, no stretched logo; 64px symbol favicon; verify browser tab and navigation at desktop/mobile. |
| Regression | Other pages, global search, navigation, login, contact list, contact creation and normal modal behavior unaffected. |

## Evidence and limitations

- Reviewed source of contact, call and task API controllers and relevant frontend permissions, routes, existing modal and CSS.
- Ran seven Node.js 22 utility tests in an isolated local harness (Asia/Kolkata timezone); all seven passed. The tested utility module's Git blob SHA matches the feature-branch source (5e9be7cae13d9cbc3e40383d50a567ccfab6dbcd). The tested file is added at frontend/tests/contact-workspace.test.mjs.
- Verified the original VSPH PNG's format and decompressed checksum before generating a cropped 64x64 PNG from existing artwork; visually inspected the cropped symbol.
- This environment cannot fetch the entire repository using local Git or install dependencies from the network. Full Vite build, ESLint, browser, authenticated API and accessibility/performance testing have not been run here. Do not treat the implementation as production-ready until these checks are completed.
- The organization repository was not modified. A single upstream PR is planned only after local acceptance.

## Offline visual review

When backend credentials are unavailable, follow [contact-preview.md](contact-preview.md). The preview exercises the real components against isolated fixture data; it does not replace the live API test matrix above.

### Composer refinement checks

- [ ] Call subject/outcome, call notes and task subject show their required asterisks inline with label text; native required validation still works.
- [ ] No top-right composer collapse toggle and no Reset button; Cancel closes each composer without an API mutation, restores quick-action focus and preserves draft when reopened.
- [ ] Cancel disabled during save; after a failed save, Cancel remains available. The same behavior appears in the seeded preview and the real workspace.

### Contact summary alignment checks

- [ ] Full, reference and long-content fixtures show the same label and value start positions across all six summary rows; no right-aligned ragged text.
- [ ] Email and phone remain on a single line, showing an ellipsis only if necessary. Hover displays the complete value, copy returns the complete value, and expanded details expose readable professional email and mobile values. The underlying mailto/tel destinations are unchanged.
- [ ] Long account/designation/campaign text wraps naturally without horizontal overflow. Verify at desktop, laptop and narrow mobile widths, including copy focus and failed clipboard feedback.

### Identity simplification checks

- [ ] Identity header contains avatar, contact name, record code and permitted actions only; no call-status indicator or duplicated owner. Owner remains in Contact details and call status in expanded Additional information.
- [ ] Header has no leftover blank status/owner row; content is vertically centered on desktop and wraps at narrow widths.

### Expanded property formatting checks

- [ ] Open every property group; label and value tracks align with the summary at desktop and mobile widths, with identical typography and row spacing.
- [ ] External profile/navigator URL labels truncate gracefully; icons remain beside the text and links open the complete destination. Expanded email and phone values remain readable/copyable; long descriptive values wrap without horizontal overflow.
