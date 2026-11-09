# SupportDesk Database Design Notes

## 1. Project Overview

Project Name: SupportDesk

Database: PostgreSQL

ORM: Prisma

## 2. Database Entities

### 1. User
Stores information about system users.

### 2. Ticket
Stores customer support ticket information.

### 3. Comment
Stores comments related to support tickets.

### 4. Tag
Stores tags used to categorize tickets.

### 5. Attachment
Stores file information related to tickets.

### 6. AuditLog
Stores records of user activities and system changes.

## 3. User Roles

- Customer
- Agent
- Admin

## 4. Ticket Status

- Open
- In Progress
- Waiting on Customer
- Resolved
- Closed

## 5. Ticket Priority

- P1
- P2
- P3
- P4

## 6. Proposed Entity Fields

### User
- id
- name
- email
- passwordHash
- role

### Ticket
- id
- title
- description
- status
- priority
- category
- createdById
- assigneeId
- slaDueAt

### Comment
- id
- ticketId
- authorId
- body
- visibility (internal/public)

### Tag
- id
- name

### Attachment
- id
- ticketId
- fileName
- storageReference

### AuditLog
- id
- actorId
- action
- target
- timestamp

Note: These fields are AI-proposed based on the Day 8 task.
Final fields require project requirement confirmation.

## 7. Primary Keys and Foreign Keys

| Entity | Primary Key | Foreign Keys |
|---|---|---|
| User | id | None |
| Ticket | id | createdById, assigneeId |
| Comment | id | ticketId, authorId |
| Tag | id | None |
| Attachment | id | ticketId |
| AuditLog | id | actorId |

Note: Foreign key relationships are proposed and require confirmation.

## 8. Proposed Relationships

1. One User can create many Tickets.
2. One User can be assigned many Tickets.
3. One Ticket can have many Comments.
4. One User can write many Comments.
5. One Ticket can have many Attachments.
6. One User can create many AuditLog entries.
7. Many Tickets can have many Tags.

## 9. Relationship Types

- User to Ticket: One-to-Many (1:N)
- Ticket to Comment: One-to-Many (1:N)
- User to Comment: One-to-Many (1:N)
- Ticket to Attachment: One-to-Many (1:N)
- User to AuditLog: One-to-Many (1:N)
- Ticket to Tag: Many-to-Many (M:N)

## 10. Important Notes

- Primary keys uniquely identify records.
- Foreign keys establish relationships between tables.
- Enums can define fixed values for roles, ticket statuses, and priorities.
- Indexes can improve database query performance.
- Prisma will be used as the ORM.
- PostgreSQL will be used as the database.

## 11. Pending Confirmations

The following points require confirmation from the project lead:

1. Final fields for all entities.
2. Whether customers and agents have different permissions.
3. Ticket creation and assignment rules.
4. Comment visibility rules.
5. Ticket and Tag relationship implementation.
6. Attachment storage requirements.
7. AuditLog details and tracking requirements.
8. Required database indexes.

Note: This document is an AI-assisted proposed database design.
It is not a final approved database schema.

## 12. Proposed Index Decisions

| Field | Purpose | Decision |
|---|---|---|
| id | Unique record lookup | Automatically indexed as Primary Key |
| status | Filter tickets by status | Candidate index |
| priority | Filter tickets by priority | Candidate index |

Note:
- Primary keys are automatically indexed by PostgreSQL.
- Additional indexes should be based on actual database queries.
- Indexes may improve read performance but can increase write overhead.
- Final index decisions require query review.