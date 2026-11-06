# Refactoring Plan – SupportDesk API

## 1. Objective

The objective of refactoring is to improve code quality, readability, maintainability, and separation of responsibilities without changing the existing API behavior.

The application will follow the architecture:

**Routes → Controllers → Services → Repositories**

## 2. Identified Areas for Refactoring

| No. | Issue | Proposed Improvement | File |
|---|---|---|---|
| 1 | Mixed Responsibilities | Separate route handling, request handling, business logic, and data operations. | `app.js`, `src/routes/`, `src/controllers/`, `src/services/`, `src/repositories/` |
| 2 | Duplicate Code | Reduce repeated ticket lookup and close/reopen logic where appropriate. | `ticket.service.js`, `ticket.controller.js` |
| 3 | Repeated Error Handling | Use a consistent approach for handling expected errors. | `ticket.controller.js` |
| 4 | Hard-coded Port | Consider environment-based port configuration. | `app.js` |
| 5 | Global Mutable State | Keep ticket data operations inside the repository layer. | `ticket.repository.js` |
| 6 | Incomplete Input Validation | Improve validation of ticket input without changing existing requirements. | `ticket.controller.js` |
| 7 | Missing Priority Validation | Confirm supported priority values before adding validation rules. | `ticket.controller.js` |
| 8 | Poor Variable Naming | Replace unclear variable names with meaningful names. | `ticket.repository.js` |
| 9 | Hard-coded Initial Data | Review how initial ticket data is maintained. | `ticket.repository.js` |

## 3. Additional Improvements Identified by AI

| No. | Finding | Proposed Improvement |
|---|---|---|
| 1 | Synchronous Filtering in Service | Consider moving filtering operations into repository methods. |
| 2 | Invalid ID Validation | Validate ticket IDs as positive integers. |
| 3 | Inconsistent Service Result Shapes | Use a consistent service result structure for success and failure cases. |

## 4. Refactoring Approach

1. Review the existing application and its API endpoints.
2. Separate responsibilities according to the proposed architecture.
3. Keep database/data operations inside the repository layer.
4. Improve duplicated logic and error handling.
5. Review input validation requirements before changing validation rules.
6. Make small, focused changes.
7. Compare API responses before and after refactoring.
8. Run available tests to verify that existing functionality is preserved.

## 5. Expected Outcomes

- Better separation of responsibilities.
- Improved code readability.
- Reduced code duplication.
- Consistent error handling.
- Improved input validation.
- Easier maintenance and testing.
- Preserved existing API behavior.

## 6. Testing and Verification

The following endpoints should be verified before and after refactoring:

| Method | Endpoint | Expected Behavior |
|---|---|---|
| GET | `/health` | Health check response |
| GET | `/tickets` | Retrieve all tickets |
| GET | `/tickets/1` | Retrieve a ticket by ID |
| POST | `/tickets` | Create a new ticket |
| PATCH | `/tickets/1/close` | Close a ticket |
| PATCH | `/tickets/1/reopen` | Reopen a ticket |

Also verify:
- Invalid ticket input.
- Ticket not found.
- Already closed ticket.
- Already open ticket.
- Ticket filtering by status and priority.

## 7. Scope and Approval

This plan is based on the manual and AI code review findings.

No additional dependencies or new business requirements are included.

**Important:** This is a proposed refactoring plan. Implementation should begin after mentor approval. Any validation or API behavior changes must be confirmed before implementation.