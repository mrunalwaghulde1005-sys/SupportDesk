# Day 17 Categorisation Evaluation Report

The lead-provided 20-ticket labelled evaluation dataset was not present in the
repository. The existing `cli/sample-tickets.csv` and JSON files are seed data,
not a verified lead-labelled evaluation set, and were not used to claim
accuracy.

## Repeatable script

Run from `apps/api`:

```powershell
npm.cmd run evaluate:categorization -- eval/day-17-labelled-tickets.json
```

The script:

- reads exactly 20 labelled records;
- uses PII masking and guarded prompt context;
- calls the existing Gemini categorisation provider;
- validates provider output with the strict Zod schema;
- computes `Correct / Total * 100`;
- lists incorrect or invalid predictions.

No credentials or real customer data are required in source fixtures.

## Actual results

- Total predictions: 0 measured / 20 pending
- Correct predictions: 0 measured
- Incorrect predictions: pending
- Accuracy: pending
- Acceptance target: at least 16/20 (80%)
- Blocker: lead-labelled dataset unavailable
