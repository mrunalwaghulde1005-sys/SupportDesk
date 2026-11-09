# SupportDesk Database Design Notes

## 1. Technology
- Database: PostgreSQL
- ORM: Prisma
- Schema: apps/api/prisma/schema.prisma

## 2. Entities
- User
- Ticket
- Comment
- Tag
- Attachment
- AuditLog

## 3. User Fields
- id: Int, primary key, auto-increment
- name: String
- email: String, unique
- passwordHash: String
- role: UserRole, default CUSTOMER
- createdAt: DateTime, default now
- updatedAt: DateTime, automatically updated

## 4. Ticket Fields
- id: Int, primary key, auto-increment
- title: String
- description: String
- status: TicketStatus
- priority: TicketPriority
- category: String
- createdById: Int, foreign key
- assigneeId: Int?, optional foreign key
- slaDueAt: DateTime?, optional

## 5. Comment Fields
- id: Int, primary key
- ticketId: Int, foreign key
- authorId: Int, foreign key
- body: String
- visibility: CommentVisibility
- createdAt: DateTime, default now

## 6. Tag Fields
- id: Int, primary key
- name: String, unique

## 7. Attachment Fields
- id: Int, primary key
- ticketId: Int, foreign key
- fileName: String
- storageReference: String

## 8. AuditLog Fields
- id: Int, primary key
- actorId: Int, foreign key
- action: String
- target: String
- timestamp: DateTime, default now

## 9. Enums

UserRole:
- CUSTOMER
- AGENT
- ADMIN

TicketStatus:
- OPEN
- IN_PROGRESS
- WAITING_ON_CUSTOMER
- RESOLVED
- CLOSED

TicketPriority:
- P1
- P2
- P3
- P4

CommentVisibility:
- INTERNAL
- PUBLIC

## 10. Relationships
- User creates many Tickets.
- User can be assigned many Tickets.
- Ticket has many Comments.
- User writes many Comments.
- Ticket and Tag have a many-to-many relationship.
- Ticket has many Attachments.
- User has many AuditLog records.

## 11. Migration and Seed Verification
- Initial Prisma migration applied successfully.
- Prisma Client generated successfully.
- Seed script inserted 50 fictional tickets.
- Seed verification reported 8 demo users.
- Independent SQL verification confirmed 50 seed tickets, 5 CUSTOMER users, and 3 AGENT users.

## 12. Implementation Notes and Pending Decisions
- Ticket ID is an integer auto-incrementing primary key.
- Category is currently a String.
- assigneeId and slaDueAt are optional.
- Ticket does not currently define createdAt or updatedAt.
- bcryptjs with cost factor 12 was used for demo password hashes; this is an implementation choice, not a confirmed task requirement.
- Final fields, permissions, attachment storage, audit requirements, indexes, and authentication rules require project-lead confirmation.
- This document describes the current implementation, not a final approved design.

## 13. Related File
ERD: docs/supportdesk-erd.md
