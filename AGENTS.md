# Vantage — Global AGENTS Rules (applies everywhere)
# Platform Developer: Munyaradzi Chenjerai

## Operating mode
- Plan first (3–7 checkpoints). Then implement checkpoint-by-checkpoint.
- Keep diffs minimal: only change what is required for the requested task.
- No "nice to have" refactors, renames, or formatting-only churn.

## Safety & control
- Ask before adding dependencies.
- Ask before refactoring more than 3 files in a single change.
- Never change secrets, keys, credentials, or .env files.
- Never commit generated secrets or personal data.

## Quality gates (must run before completion)
- Run lint + typecheck + tests (or the closest available equivalents).
- If tests fail, fix or clearly report the failure with the error output and next step.

## Output format
After each checkpoint:
1) Summary of what was done
2) List of files changed
3) How to verify (commands)

## Shared conventions
- All validation at boundaries must use Zod (web forms + API inputs).
- Shared types come from packages/types — do not duplicate types.
- DB access only through Prisma (packages/db).
