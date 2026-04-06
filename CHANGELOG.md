# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.0] - 2026-04-06

### Added
- Slack-style message list with role-based grouping (user/assistant/system/tool), thinking blocks, tool call cards, and JSON collapsible rendering
- ConfirmDialog component with primary/warning/danger variants and loading state support
- OpenClawLogsPanel with SSE real-time streaming, auto/manual scroll mode toggle, level filtering (info/warn/error), and text search
- ChatControls toolbar with copy/regenerate actions on message hover
- Enhanced slash command system with argument suggestions and options display
- Agent management API routes (`/api/openclaw/agents`) for CRUD operations
- Session list sidebar with two-line layout and selection persistence
- Gateway status detection via `/api/gateway/status` API endpoint
- SQLite local message persistence layer with history API
- `update` action added to CLI exec whitelist
- Comprehensive test suite: 13 test files, 133 tests covering core components

### Changed
- MessageList component fully rewritten from flat list to grouped message architecture
- Composer component enhanced with slash command argument autocomplete UI
- ChatApp layout improved with resizable panels, agent sidebar, and session sidebar
- API chat route (`/api/chat`) now extracts thinking, usage, cost, model, contextPercent, and rawContent from gateway messages
- Log panel refactored from basic list to full SSE-powered real-time dashboard
- Gateway connection check migrated to dedicated status API (more reliable than WebSocket probe)
- Input box placeholder text updated to reflect slash command capability

### Fixed
- ChatApp hydration mismatch between server and client rendering
- Composer syntax error in streaming abort button handler
- Log panel auto-scroll mode switching and pending count tracking
- Browser-side gateway connection detection using REST API instead of WebSocket probe
- E2E test failures due to timing and selector updates
- 4 test files aligned with implementation changes (CSS class names, button titles, streaming behavior)

### Removed
- 35 debug `console.log` statements from OpenClawLogsPanel production code
- Deprecated progress tracking documents
