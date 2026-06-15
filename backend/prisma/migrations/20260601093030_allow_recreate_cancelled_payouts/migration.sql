-- DropIndex
DROP INDEX "EmployeeCompensationPayout_userId_periodStart_periodEnd_key";

-- CreateIndex
CREATE INDEX "EmployeeCompensationPayout_userId_periodStart_periodEnd_idx" ON "EmployeeCompensationPayout"("userId", "periodStart", "periodEnd");
