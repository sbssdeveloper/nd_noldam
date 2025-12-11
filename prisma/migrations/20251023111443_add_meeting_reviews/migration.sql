-- CreateTable
CREATE TABLE "meeting_reviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_reviews_userId_meetingId_key" ON "meeting_reviews"("userId", "meetingId");

-- AddForeignKey
ALTER TABLE "meeting_reviews" ADD CONSTRAINT "meeting_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_reviews" ADD CONSTRAINT "meeting_reviews_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
