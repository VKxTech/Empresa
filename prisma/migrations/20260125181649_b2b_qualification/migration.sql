-- AlterTable
ALTER TABLE "Request" ADD COLUMN "investmentRange" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "personType" TEXT NOT NULL,
    "companyName" TEXT,
    "website" TEXT,
    "need" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "consentIp" TEXT,
    "consentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Novo',
    "score" INTEGER NOT NULL DEFAULT 0,
    "sequenceStep" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "notes" TEXT,
    "lastEmailedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lead" ("companyName", "consent", "consentAt", "consentIp", "createdAt", "email", "id", "lastEmailedAt", "name", "need", "notes", "personType", "phone", "status", "tags", "website") SELECT "companyName", "consent", "consentAt", "consentIp", "createdAt", "email", "id", "lastEmailedAt", "name", "need", "notes", "personType", "phone", "status", "tags", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
