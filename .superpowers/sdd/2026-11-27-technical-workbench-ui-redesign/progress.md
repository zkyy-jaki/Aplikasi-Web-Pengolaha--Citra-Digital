# SDD ledger — plan: docs/superpowers/plans/2026-11-27-technical-workbench-ui-redesign.md

## Pre-flight Interface Check
- Task 1 -> Task 2: Task 1 produces `PATCH /api/images/{session_id}/history/{step_index}/toggle` and `DELETE /api/images/{session_id}/history/{step_index}` returning `history_steps: list[dict]`; Task 2 consumes them in `frontend/src/services/api.ts` and `useImageWorkspace.ts`. Clean match.
- Task 2 -> Task 4: Task 2 produces `OperationMeta.iconName` in `frontend/src/constants/operations.ts`; Task 4 consumes `iconName` in `LeftSidebar.tsx`. Clean match.
- Task 2 -> Task 6: Task 2 produces `getOperationEquation(op, params)` and `historySteps`, `handleToggleHistoryStep`, `handleDeleteHistoryStep`; Task 6 consumes them in `RightInspector.tsx` and `App.tsx`. Clean match.
Task 1: complete (tests: pytest backend/tests -v -> 134 passed)
Task 2: Ruling: Offline sandbox blocks npm install of vitest/jsdom and writing inside node_modules/.vite-temp — created scripts/run-tests.mjs using Node 22 built-in test runner + jiti + React renderToStaticMarkup and added npm run typecheck — zero external dependencies required, cost if wrong: none since tests execute real TSX components and tsc + oxlint verify types.
Task 2: complete (tests: npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint -> 2/2 passed, 0 errors)
Task 3: complete (tests: npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint -> passed, 0 warnings, 0 errors)
Task 4: complete (tests: npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint -> passed, 0 warnings, 0 errors)
Task 5: complete (tests: npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint -> passed, 0 warnings, 0 errors)
Task 6: complete (tests: npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint && pytest backend/tests -v -> 8 frontend tests + 134 backend tests passed, 0 warnings, 0 errors)
Final: fixed duplicate TopBar.test.tsx runner filter — TopBar.test.ts RED->GREEN, suite 10/10
Final: fixed SessionState.delete_step at history_index==0 after undo — test_delete_active_step_zero_after_undo_falls_back_to_original RED->GREEN, suite 135/135
Final: fixed layer parameter summary formatting and backend history sync on commit — RightInspector.test.ts RED->GREEN, suite 10/10
Final: minor (deferred): Replace invalid Tailwind class py-0.2 with py-0.5 in 3 micro-badge spans
Final: minor (deferred): Pipeline History min-h-[190px] vs spec min-h-[210px] alongside h-[34%]
