# Safe SunShield synchronization

Inspection baseline: current branch feature/core-intelligence at 2c929b7; develop at f7f02ce is an ancestor. The working tree was clean before this integration phase. No remote, tracking branches or Developer B implementation are configured locally. A GitHub repository URL has been requested. No fetch, merge or push has been attempted.

Git reports ownership differences left by the earlier sandbox account. Commands below scope safe.directory to this exact repository for each invocation; they do not change global Git trust settings.

## Once the repository URL is supplied

First save/review this phase's documentation and examples in a local commit, then require a clean working tree. Inspect the URL and remote refs before integrating:

```powershell
git -c safe.directory=D:/codestorm status --short
git -c safe.directory=D:/codestorm remote -v
git -c safe.directory=D:/codestorm remote add origin <provided-GitHub-URL>
git -c safe.directory=D:/codestorm ls-remote --heads origin
git -c safe.directory=D:/codestorm fetch origin
git -c safe.directory=D:/codestorm log --graph --oneline --decorate --all -30
```

The URL placeholder is documentation only. If a remote has since appeared, inspect and use it; do not replace it automatically. Fetch only after confirming the intended repository. It updates remote-tracking refs without merging teammate files into the working tree.

## Inspect history before any merge or push

If origin/develop exists:

```powershell
git -c safe.directory=D:/codestorm merge-base develop origin/develop
git -c safe.directory=D:/codestorm log --left-right --oneline develop...origin/develop
git -c safe.directory=D:/codestorm diff --stat develop origin/develop
```

Also compare feature/core-intelligence to origin/feature/core-intelligence if that remote branch exists. Inspect actual teammate file diffs, especially weather, database, Prisma, Safe Zones and infrastructure. Do not blindly merge or publish a branch over someone else's work.

- Empty remote: publish develop with `git -c safe.directory=D:/codestorm push -u origin develop`, then feature/core-intelligence with `git -c safe.directory=D:/codestorm push -u origin feature/core-intelligence`.
- Related history, local branch strictly ahead: inspect outgoing commits, use `push --dry-run origin <branch>`, then a normal `push -u origin <branch>`.
- Related history, remote ahead or branches diverged: prepare a separate integration branch from the appropriate remote branch. Merge the inspected local feature there using an ordinary merge. Coordinate any teammate-owned conflicts before resolving them; rerun checks and push the integration branch for review. Preserve the completed local branches.
- No common ancestor: this local repository was independently initialized. Do not force-push, reset, or automatically use --allow-unrelated-histories. Coordinate the intended base; a separate integration branch and reviewed file import/cherry-picks may be needed, especially because the initial foundation commit has a follow-up correction. Inspect the resulting tree before publishing.

If the remote contains only another default branch, inspect it and agree the develop base before creating remote integration branches. Never delete remote branches or rewrite history. Use a normal review/PR workflow; do not merge to the shared remote integration branch without the team's intended integration path being clear.

## Required checks after integration

From backend: `npm run typecheck`, `npm run build`, `npm test`, then `node scripts/verify-integration.mjs`. Verify real provider paths separately once Developer B supplies them; the runner's inline fixtures are not live weather. Review `git diff --check` and branch status before a normal push.
