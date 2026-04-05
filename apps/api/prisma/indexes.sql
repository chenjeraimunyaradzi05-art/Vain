/**
 * Database Index Recommendations
 * 
 * This file documents recommended database indexes
 * for optimal query performance.
 * 
 * Run these after migrating to PostgreSQL.
 */

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "User" (email);
CREATE INDEX IF NOT EXISTS idx_user_type ON "User" ("userType");
CREATE INDEX IF NOT EXISTS idx_user_created ON "User" ("createdAt" DESC);

-- Job indexes
CREATE INDEX IF NOT EXISTS idx_job_active ON "Job" ("isActive");
CREATE INDEX IF NOT EXISTS idx_job_company ON "Job" ("companyId");
CREATE INDEX IF NOT EXISTS idx_job_location ON "Job" (location);
CREATE INDEX IF NOT EXISTS idx_job_industry ON "Job" (industry);
CREATE INDEX IF NOT EXISTS idx_job_created ON "Job" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_job_active_created ON "Job" ("isActive", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_job_search ON "Job" USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Job Application indexes
CREATE INDEX IF NOT EXISTS idx_application_job ON "JobApplication" ("jobId");
CREATE INDEX IF NOT EXISTS idx_application_applicant ON "JobApplication" ("applicantId");
CREATE INDEX IF NOT EXISTS idx_application_status ON "JobApplication" (status);
CREATE INDEX IF NOT EXISTS idx_application_created ON "JobApplication" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_application_job_status ON "JobApplication" ("jobId", status);

-- Member Profile indexes
CREATE INDEX IF NOT EXISTS idx_member_profile_user ON "MemberProfile" ("userId");
CREATE INDEX IF NOT EXISTS idx_member_profile_skills ON "MemberProfile" USING GIN ("skillLevel");

-- Company Profile indexes
CREATE INDEX IF NOT EXISTS idx_company_profile_user ON "CompanyProfile" ("userId");
CREATE INDEX IF NOT EXISTS idx_company_verified ON "CompanyProfile" ("isVerified");
CREATE INDEX IF NOT EXISTS idx_company_industry ON "CompanyProfile" (industry);

-- Mentor Profile indexes
CREATE INDEX IF NOT EXISTS idx_mentor_profile_user ON "MentorProfile" ("userId");
CREATE INDEX IF NOT EXISTS idx_mentor_active ON "MentorProfile" (active);
CREATE INDEX IF NOT EXISTS idx_mentor_industry ON "MentorProfile" (industry);

-- Mentor Session indexes
CREATE INDEX IF NOT EXISTS idx_session_mentor ON "MentorSession" ("mentorId");
CREATE INDEX IF NOT EXISTS idx_session_mentee ON "MentorSession" ("menteeId");
CREATE INDEX IF NOT EXISTS idx_session_status ON "MentorSession" (status);
CREATE INDEX IF NOT EXISTS idx_session_scheduled ON "MentorSession" ("scheduledAt");
CREATE INDEX IF NOT EXISTS idx_session_mentor_upcoming ON "MentorSession" ("mentorId", "scheduledAt") 
  WHERE status IN ('SCHEDULED', 'CONFIRMED');

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_course_institution ON "Course" ("institutionId");
CREATE INDEX IF NOT EXISTS idx_course_active ON "Course" ("isActive");
CREATE INDEX IF NOT EXISTS idx_course_industry ON "Course" (industry);
CREATE INDEX IF NOT EXISTS idx_course_search ON "Course" USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Course Enrolment indexes
CREATE INDEX IF NOT EXISTS idx_enrolment_course ON "CourseEnrolment" ("courseId");
CREATE INDEX IF NOT EXISTS idx_enrolment_user ON "CourseEnrolment" ("userId");
CREATE INDEX IF NOT EXISTS idx_enrolment_status ON "CourseEnrolment" (status);

-- Forum indexes
CREATE INDEX IF NOT EXISTS idx_forum_thread_category ON "ForumThread" ("categoryId");
CREATE INDEX IF NOT EXISTS idx_forum_thread_author ON "ForumThread" ("authorId");
CREATE INDEX IF NOT EXISTS idx_forum_thread_pinned ON "ForumThread" ("isPinned", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_forum_reply_thread ON "ForumReply" ("threadId");
CREATE INDEX IF NOT EXISTS idx_forum_reply_author ON "ForumReply" ("authorId");

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification" ("userId");
CREATE INDEX IF NOT EXISTS idx_notification_read ON "Notification" ("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notification_created ON "Notification" ("createdAt" DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_message_conversation ON "Message" ("conversationId");
CREATE INDEX IF NOT EXISTS idx_message_sender ON "Message" ("senderId");
CREATE INDEX IF NOT EXISTS idx_message_created ON "Message" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participant ON "ConversationParticipant" ("userId", "conversationId");

-- Social Feed indexes
CREATE INDEX IF NOT EXISTS idx_post_author ON "SocialPost" ("authorId");
CREATE INDEX IF NOT EXISTS idx_post_created ON "SocialPost" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_post_group ON "SocialPost" ("groupId", "createdAt" DESC);

-- Connection indexes
CREATE INDEX IF NOT EXISTS idx_connection_user ON "Connection" ("userId");
CREATE INDEX IF NOT EXISTS idx_connection_connected ON "Connection" ("connectedUserId");
CREATE INDEX IF NOT EXISTS idx_connection_status ON "Connection" (status);
CREATE INDEX IF NOT EXISTS idx_connection_pair ON "Connection" ("userId", "connectedUserId");

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscription_user ON "Subscription" ("userId");
CREATE INDEX IF NOT EXISTS idx_subscription_status ON "Subscription" (status);
CREATE INDEX IF NOT EXISTS idx_subscription_stripe ON "Subscription" ("stripeSubscriptionId");

-- Audit Log indexes (if using audit logging)
CREATE INDEX IF NOT EXISTS idx_audit_user ON "AuditLog" ("userId");
CREATE INDEX IF NOT EXISTS idx_audit_event ON "AuditLog" (event);
CREATE INDEX IF NOT EXISTS idx_audit_category ON "AuditLog" (category);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON "AuditLog" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON "AuditLog" (severity, "timestamp" DESC);

-- Full-text search indexes for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_user_fts ON "User" USING GIN (to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_mentor_fts ON "MentorProfile" USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(bio, '') || ' ' || COALESCE(skills, '')));

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_active_jobs ON "Job" ("createdAt" DESC) WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_active_mentors ON "MentorProfile" ("userId") WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_unread_notifications ON "Notification" ("userId", "createdAt" DESC) WHERE "isRead" = false;

-- ANALYZE tables after creating indexes
ANALYZE "User";
ANALYZE "Job";
ANALYZE "JobApplication";
ANALYZE "MentorProfile";
ANALYZE "MentorSession";
ANALYZE "Course";
ANALYZE "CourseEnrolment";
ANALYZE "ForumThread";
ANALYZE "Notification";
ANALYZE "Message";
ANALYZE "SocialPost";
ANALYZE "Connection";
ANALYZE "Subscription";
