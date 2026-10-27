# Day 5 — Debugging Exercise

## 1. Objective

Practise diagnosing a defect, identifying its root cause, applying the smallest fix, and verifying the result with Jest tests.

## 2. Intentional Defect

In `src/csvToJson.ts`, I temporarily changed the field-mapping expression from:

```ts
row[header] = values[index] ?? "";
```

to:

```ts
row[header] = values[index + 1] ?? "";
```

This was a local, reversible change made only for the debugging exercise.

## 3. Failure Observed

Command executed:

```powershell
npm.cmd test -- --runTestsByPath tests/csvToJson.test.ts
```

Actual result:

- Test suites: 1 failed
- Tests: 2 failed, 2 passed
- The CSV conversion test and whitespace-trimming test failed.

Expected values included:

```json
{ "name": "Amit", "age": "22" }
```

The faulty code instead produced:

```json
{ "name": "22", "age": "" }
```

## 4. Root Cause

The expression used `values[index + 1]`, which reads the next column instead of the column matching the current header.

For the `name` header, it selected the age value. For the `age` header, no next value existed, so the nullish-coalescing operator (`??`) supplied an empty string.

## 5. Fix Applied

Restored the original field-mapping expression:

```ts
row[header] = values[index] ?? "";
```

This maps each header to the value at the corresponding index and retains the empty-string fallback for missing values.

## 6. Verification

### CSV tests

Command:

```powershell
npm.cmd test -- --runTestsByPath tests/csvToJson.test.ts
```

Actual result after the fix:

- Test suites: 1 passed
- Tests: 4 passed, 4 total

### Full test suite

Command:

powershell
npm.cmd test
```

Actual result:

- Test suites: 2 passed, 2 total
- Tests: 8 passed, 8 total

### Git working tree

Commands:

```powershell
git diff -- src/csvToJson.ts
git status


The final source diff was empty, and Git reported `nothing to commit, working tree clean`.

## 7. What I Learned

- Read the expected and received test output carefully.
- Trace incorrect output back to the relevant expression.
- Identify the root cause before applying a fix.
- Prefer the smallest possible code change.
- Rerun both the failing tests and the complete test suite.
- Never commit or push the intentionally broken version.
