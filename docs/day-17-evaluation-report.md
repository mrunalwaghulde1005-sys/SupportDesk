# Day 17 Categorisation Evaluation Report

## Dataset

`apps/api/tests-data/labelled-evaluation-tickets.json` contains 20 synthetic
evaluation records. These labels are not confirmed as lead-provided labels and
are not production customer data.

Each record provides `title`, `description`, and `expectedCategory`, matching
the evaluation script's input format.

## Repeatable script

Run from `apps/api`:

```powershell
npm.cmd run evaluate:categorization -- tests-data/labelled-evaluation-tickets.json
```

The script processes the records sequentially, applies the existing PII
masking and guarded context construction, calls the Gemini categorisation
provider, validates output with the strict Zod schema, calculates accuracy,
and lists incorrect predictions.

## Latest verified results

- Total predictions: 20
- Correct predictions: 17
- Incorrect predictions: 3
- Accuracy: **85.00%** (`17 / 20 * 100`)
- Acceptance target: 80% (at least 16 of 20)
- Acceptance result: **Met**

Incorrect predictions:

| Ticket | Expected | Predicted |
|---|---|---|
| Cannot sign in after password reset | Account | Technical |
| Profile details not saving | Account | Technical |
| Session expires immediately | Account | Technical |

## Earlier fetch failure

An earlier evaluation attempt failed in `fetch()` before an upstream HTTP
status was received. The available log did not contain a cause code, so the
root cause of that attempt is unknown; a quota error is not confirmed. After
safe network diagnostics were added, a live smoke test and a subsequent full
evaluation succeeded.
