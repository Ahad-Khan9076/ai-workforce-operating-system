-- CreateEnum
CREATE TYPE "CopilotMode" AS ENUM ('HR', 'MANAGER', 'EMPLOYEE');
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
CREATE TYPE "AiToolCallStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REQUIRES_CONFIRMATION');
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXECUTED', 'FAILED');

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "providerCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_tools" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "requiredPermissions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_tools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "CopilotMode" NOT NULL,
    "title" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_tool_calls" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "toolId" TEXT,
    "toolCode" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "status" "AiToolCallStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_tool_calls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dataRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolCallId" TEXT,
    "toolCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT,
    "userId" TEXT,
    "toolCode" TEXT,
    "actionType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_providerCode_modelName_organizationId_key" ON "ai_models"("providerCode", "modelName", "organizationId");
CREATE UNIQUE INDEX "ai_tools_code_organizationId_key" ON "ai_tools"("code", "organizationId");
CREATE INDEX "ai_conversations_organizationId_userId_updatedAt_idx" ON "ai_conversations"("organizationId", "userId", "updatedAt");
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");
CREATE INDEX "ai_tool_calls_toolCode_createdAt_idx" ON "ai_tool_calls"("toolCode", "createdAt");
CREATE UNIQUE INDEX "ai_actions_toolCallId_key" ON "ai_actions"("toolCallId");
CREATE INDEX "ai_actions_organizationId_status_idx" ON "ai_actions"("organizationId", "status");
CREATE INDEX "ai_recommendations_organizationId_conversationId_idx" ON "ai_recommendations"("organizationId", "conversationId");
CREATE INDEX "ai_audit_logs_organizationId_createdAt_idx" ON "ai_audit_logs"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_tools" ADD CONSTRAINT "ai_tools_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_tool_calls" ADD CONSTRAINT "ai_tool_calls_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_tool_calls" ADD CONSTRAINT "ai_tool_calls_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "ai_tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ai_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "ai_tool_calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
