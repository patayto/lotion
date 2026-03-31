-- AlterTable: add completedByUserId to TaskProgress
ALTER TABLE "TaskProgress" ADD COLUMN "completedByUserId" TEXT;

-- CreateTable: TaskEvent
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "taskProgressId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: TaskProgress.completedByUserId -> User.id
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: TaskEvent.taskProgressId -> TaskProgress.id
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskProgressId_fkey" FOREIGN KEY ("taskProgressId") REFERENCES "TaskProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: TaskEvent.userId -> User.id
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
