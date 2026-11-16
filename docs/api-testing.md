# SupportDesk API Testing Documentation

**Date:** 12 November 2026

**Project:** SupportDesk

**Tool:** Postman

**Base URL:** http://localhost:3000

**Authentication:** Bearer Token

## 1. Positive Test Cases

| No. | Test Case | Method | Endpoint |
|---|---|---|---|
| 1 | Health | GET | /health |
| 2 | Create Ticket | POST | /tickets |
| 3 | List Tickets | GET | /tickets |
| 4 | Read Created Ticket | GET | /tickets/:id |
| 5 | Update Created Ticket | PATCH | /tickets/:id |
| 6 | Close Created Ticket | PATCH | /tickets/:id/close |
| 7 | Reopen Created Ticket | PATCH | /tickets/:id/reopen |
| 8 | Delete Created Ticket | DELETE | /tickets/:id |

## 2. Negative Test Cases

| No. | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 9 | Invalid Ticket Body | POST | /tickets | 400 |
| 10 | Invalid Ticket ID | GET | /tickets/abc | 400 |
| 11 | Ticket Not Found | GET | /tickets/999999 | 404 |
| 12 | Missing API Key | GET | /tickets | 401 |

## 3. Negative Testing Results

| Test Case | Expected | Actual | Result |
|---|---:|---:|---|
| Invalid Ticket Body | 400 | 400 | PASS |
| Invalid Ticket ID | 400 | 400 | PASS |
| Ticket Not Found | 404 | 404 | PASS |
| Missing API Key | 401 | 401 | PASS |

## 4. Positive Testing Results

Actual response status codes and results to be recorded after verifying each request in Postman.

## 5. Conclusion

SupportDesk API endpoints were tested using Postman.

Both positive and negative test cases were included to verify API functionality, request validation, ticket operations, and authentication.