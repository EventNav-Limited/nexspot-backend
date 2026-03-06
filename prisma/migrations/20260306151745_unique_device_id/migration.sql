/*
  Warnings:

  - A unique constraint covering the columns `[device_id]` on the table `session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "session_device_id_key" ON "session"("device_id");
