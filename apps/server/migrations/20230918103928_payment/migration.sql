-- CreateTable
CREATE TABLE "user_last_subscription" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "plan" VARCHAR NOT NULL,
    "session_id" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "trial_started_at" TIMESTAMPTZ(6),
    "trial_ended_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_last_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "plan" VARCHAR NOT NULL,
    "session_id" VARCHAR NOT NULL,
    "price" INTEGER,
    "currency" VARCHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_started_at" TIMESTAMPTZ(6),
    "trial_ended_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_last_subscription_user_id_key" ON "user_last_subscription"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_session_id_key" ON "user_subscriptions"("session_id");

-- AddForeignKey
ALTER TABLE "user_last_subscription" ADD CONSTRAINT "user_last_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
