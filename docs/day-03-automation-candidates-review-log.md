# Day 3 — Automation Candidate Review Log

This is my working note while I review the automation candidates. It is not the final submission file.

## CI/CD and test-data context

I realized that adding a test to CI/CD does not automatically make it safe or reliable. CI/CD can run the test automatically, but it does not solve problems with shared data, test order, or parallel execution.

For the supplied local sandbox, Playwright starts `node sandbox/server.js` through the `webServer` configuration. Starting the server again reloads the seeded data, so Alice begins each Playwright run with the expected account state.

This reset approach is specific to the supplied sandbox. In a regular QA or staging environment, data usually stays in a shared database even after the application restarts. Before approving a state-changing test for CI, I would ask:

- Is the test running in a sandbox, shared QA environment, staging environment, or production-like environment?
- Is the account dedicated to this automated test?
- How will the test data be created, reset, or cleaned up?
- Can another QA or another automated run change the same account at the same time?
- Can the tests run in parallel without affecting one another?

For example, a redemption test changes account points and creates history. It is suitable for the supplied sandbox because the data is seeded and the test run starts from a clean server. The same test should not run by default against a shared non-sandbox environment without dedicated data and a reliable reset or cleanup process.

## TC-R01 — Valid login returns a session token

### Agreed direction

Good candidate for automation.

### Review notes

- The test is repeatable, fast, and does not change shared sandbox data.
- The expected checks are status `200`, a token being present, and a numeric points value being returned.
- I should not assert a user ID unless it is confirmed as part of the response contract.
- I should not log the token in test output.

## TC-R03 — Redeeming a reward reduces the account point balance

### Agreed direction

Good candidate for the supplied sandbox only.

### Review notes

- It is suitable in the sandbox because the account starts with seeded data and the server can start fresh for the test run.
- It changes points and creates redemption history, so it is not safe by default in a shared QA, staging, or production-like environment.
- Before using it outside the sandbox, I need to confirm dedicated test accounts, reset or cleanup, and parallel-run behaviour.
