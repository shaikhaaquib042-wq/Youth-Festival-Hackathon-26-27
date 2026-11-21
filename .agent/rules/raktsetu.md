# RaktSetu project rules (always apply)

1. The SPEC (Message 2 in this chat, saved by Step 0 as docs/SPEC.md) is the source of truth. Re-read the relevant SPEC section before starting each phase. Never invent features that contradict it.
2. Work ONE phase at a time (SPEC §13). Do not start a phase until the previous gate is green. After each gate: update PROGRESS.md, then `git add -A && git commit -m "phase N: <summary>"`.
3. Do not ask me questions. Choose the simplest reliable option and record it in `docs/DECISIONS.md` (decision / alternatives / reason).
4. TERMINAL SAFETY
   - Never run a blocking command in the foreground. Run `npm run dev` as a background process, wait for "Ready", then continue. Stop it before running `npm run build`.
   - Only operate inside this project folder. No sudo, no global installs, no deleting outside the project, no `rm -rf` in any script (use cross-platform Node scripts instead).
   - Assume I may be on Windows: use only cross-platform npm scripts (no bash-only syntax), and use `tsx` for TypeScript scripts.
   - If a port is busy, use the next free port; never kill unknown processes.
5. DEPENDENCIES: install only what SPEC §2 lists. Pin exact versions in package.json after install. Commit the lockfile. Anything extra needs a DECISIONS.md entry.
6. CODE QUALITY: TypeScript strict, no `any` (ESLint error), no `// @ts-ignore`, no `Date.now()`/`Math.random()`/`window`/`fetch` inside `lib/`. No placeholder buttons: if an action is not implemented, do not render the control.
7. VERIFICATION IS MANDATORY. Never write "done" without command output. Every gate runs: `npm run lint`, `npm run typecheck`, `npm test`. From Phase 4 onward, also open the running app with the browser tool, take a screenshot of each screen you built, and fix visible bugs and console errors.
8. STOP-LOSS: if the same error persists after 3 different fix attempts, take the fallback in SPEC §12, log it in DECISIONS.md and Known Limitations, and move on. Never loop.
9. If context is getting long, finish the current gate, update PROGRESS.md thoroughly (what exists, what's next, known issues), and say so.
10. Be honest: label all simulated data and features as simulated in the UI and README. Never fabricate test results.
