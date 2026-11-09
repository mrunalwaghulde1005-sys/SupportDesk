# SupportDesk Entity Relationship Diagram

Source: `apps/api/prisma/schema.prisma`

```mermaid
---
config:
  layout: elk
title: SupportDesk Database ERD
---
erDiagram
    direction TB
    User {
        int id PK ""
        string name ""
        string email UK ""
        string passwordHash ""
        UserRole role ""
        datetime createdAt ""
        datetime updatedAt ""
    }

    Ticket {
        int id PK ""
        string title ""
        string description ""
        TicketStatus status ""
        TicketPriority priority ""
        string category ""
        int createdById FK ""
        int assigneeId FK "optional"
        datetime slaDueAt "optional"
    }

    Comment {
        int id PK ""
        int ticketId FK ""
        int authorId FK ""
        string body ""
        CommentVisibility visibility ""
        datetime createdAt ""
    }

    Tag {
        int id PK ""
        string name UK ""
    }

    Attachment {
        int id PK ""
        int ticketId FK ""
        string fileName ""
        string storageReference ""
    }

    AuditLog {
        int id PK ""
        int actorId FK ""
        string action ""
        string target ""
        datetime timestamp ""
    }

    User ||--o{ Ticket : "creates"
    User o|--o{ Ticket : "assigned_to"
    Ticket ||--o{ Comment : "has"
    User ||--o{ Comment : "writes"
    Ticket ||--o{ Attachment : "contains"
    Ticket }o--o{ Tag : has
    User ||--o{ AuditLog : "performs"
## Enums

- UserRole: CUSTOMER, AGENT, ADMIN
- TicketStatus: OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER, RESOLVED, CLOSED
- TicketPriority: P1, P2, P3, P4
- CommentVisibility: INTERNAL, PUBLIC

## Notes

- `assigneeId` and `slaDueAt` are optional.
- User email and Tag name are unique.
- Ticket IDs are integer auto-incrementing IDs.
- Ticket does not currently define createdAt or updatedAt.
- Ticket and Tag use Prisma's implicit many-to-many relation.
- This ERD documents the current implementation, not a lead-approved final design.
