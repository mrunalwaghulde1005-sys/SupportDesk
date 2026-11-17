ALTER TABLE "Ticket"
  ADD COLUMN "createdAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Preserve unknown historical dates as NULL; defaults apply only to future inserts.
ALTER TABLE "Ticket"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
