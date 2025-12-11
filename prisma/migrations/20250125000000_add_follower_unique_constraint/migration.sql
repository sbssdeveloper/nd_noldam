-- CreateIndex
CREATE UNIQUE INDEX "followers_userId_following_key" ON "followers"("userId", "following");

