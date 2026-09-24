# kerk-training-plan-1

Training repo for Full Scale / FS Learning bench training-plan-1.

## Structure

- `sandbox/` — the seeded Account API + Loyalty Points Redemption service you'll run Days 2, 3, 6, 7, 8 and 10 against. See `sandbox/README.md` to start it.
- `.github/workflows/ci.yml` — the CI scaffold. It runs on every push and PR and currently just confirms the pipeline is wired up; Day 8 is where a real test run gets added to it.

## Working here

- All changes go through a pull request — direct pushes to `main` are blocked (branch protection).
- Every PR gets an automated review pass first; anything needing changes gets a follow-up from your EM.
- Deliverables and daily updates follow the process in your training-plan document and daily EOD email, not this README.
