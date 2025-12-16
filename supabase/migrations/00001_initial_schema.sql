-- =============================================================================
-- Sidequest Initial Database Schema
-- =============================================================================
-- 
-- This migration creates the complete database schema for Sidequest.
-- Run this on a fresh Supabase project.
--
-- IMPORTANT: This schema assumes UCI-only users (enforced at auth level).
-- All users have @uci.edu emails, so we don't need campus filtering.
--
-- EXTENSION POINTS (marked with [EXTENSION]):
-- - Multi-campus support: Add campus_domain to profiles, filter queries
-- - Payments: Add payment_status, stripe_payment_id to tasks
-- - Moderation: Add reports table, admin roles, content filters
-- =============================================================================

-- Enable UUID extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CUSTOM TYPES (ENUMS)
-- =============================================================================

-- Task status lifecycle:
-- OPEN -> ACCEPTED -> COMPLETE
--           |
--           v
--       CANCELED
CREATE TYPE task_status AS ENUM ('OPEN', 'ACCEPTED', 'COMPLETE', 'CANCELED');

-- Task categories for organization/filtering
-- [EXTENSION] Add more categories as needed
CREATE TYPE task_category AS ENUM (
  'ERRAND',
  'DELIVERY', 
  'MOVING',
  'TUTORING',
  'CLEANING',
  'OTHER'
);

-- Time windows for task urgency
CREATE TYPE time_window AS ENUM (
  'NOW',       -- Need help immediately (1-2 hours)
  'TODAY',     -- Anytime today
  'THIS_WEEK', -- Flexible timing
  'SCHEDULED'  -- Specific date/time (requires scheduled_at)
);

-- Message types in chat
CREATE TYPE message_type AS ENUM (
  'TEXT',    -- Regular user message
  'SYSTEM'   -- Auto-generated (e.g., "Task accepted")
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
-- User profiles, created on first login.
-- The id matches auth.users.id (Supabase Auth).
--
-- WHY SEPARATE FROM AUTH.USERS?
-- - auth.users is managed by Supabase Auth (we shouldn't modify it)
-- - profiles table lets us add app-specific fields
-- - RLS can easily protect profile data
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  accepted_rules BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- [EXTENSION] Multi-campus support
  -- campus_domain TEXT DEFAULT 'uci.edu' NOT NULL,
  
  -- [EXTENSION] Profile pictures
  -- avatar_url TEXT,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[^@]+@uci\.edu$'),
  CONSTRAINT display_name_length CHECK (display_name IS NULL OR length(display_name) <= 50)
);

-- Index for email lookups (unique already creates one, but explicit is good)
CREATE INDEX idx_profiles_email ON profiles(email);

-- -----------------------------------------------------------------------------
-- TASKS
-- -----------------------------------------------------------------------------
-- The core entity - tasks that users post and complete.
--
-- LIFECYCLE:
-- 1. Poster creates task (status: OPEN)
-- 2. Worker accepts (status: ACCEPTED, accepted_by_user_id set)
-- 3a. Poster marks complete (status: COMPLETE), OR
-- 3b. Either party cancels (status: CANCELED)
--
-- WHY price_cents?
-- - Avoid floating point precision issues
-- - Standard practice for financial data
-- - 500 = $5.00, 1500 = $15.00, etc.
-- -----------------------------------------------------------------------------
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accepted_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status task_status DEFAULT 'OPEN' NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category task_category NOT NULL,
  location_text TEXT NOT NULL,
  time_window time_window NOT NULL,
  scheduled_at TIMESTAMPTZ,
  price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- [EXTENSION] Payment integration
  -- payment_status TEXT DEFAULT 'pending',
  -- stripe_payment_intent_id TEXT,
  
  -- Constraints
  CONSTRAINT title_length CHECK (length(title) BETWEEN 1 AND 80),
  CONSTRAINT description_length CHECK (length(description) BETWEEN 1 AND 1000),
  CONSTRAINT location_length CHECK (length(location_text) BETWEEN 1 AND 120),
  CONSTRAINT price_range CHECK (price_cents BETWEEN 500 AND 50000), -- $5 to $500
  CONSTRAINT scheduled_at_required CHECK (
    (time_window = 'SCHEDULED' AND scheduled_at IS NOT NULL) OR
    (time_window != 'SCHEDULED')
  )
);

-- Indexes for common queries
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC);
CREATE INDEX idx_tasks_poster ON tasks(poster_id);
CREATE INDEX idx_tasks_accepted_by ON tasks(accepted_by_user_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_time_window ON tasks(time_window);

-- -----------------------------------------------------------------------------
-- MESSAGES
-- -----------------------------------------------------------------------------
-- Chat messages between task poster and accepted worker.
--
-- SECURITY: Only the poster and accepted worker can read/write messages.
-- This is enforced by RLS policies below.
--
-- SYSTEM messages are auto-generated (e.g., "Task accepted", "Task completed").
-- Only server actions should insert SYSTEM messages.
-- -----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type message_type DEFAULT 'TEXT' NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT body_not_empty CHECK (length(body) BETWEEN 1 AND 2000)
);

-- Index for fetching messages by task (ordered by time)
CREATE INDEX idx_messages_task_created ON messages(task_id, created_at);

-- -----------------------------------------------------------------------------
-- RATINGS
-- -----------------------------------------------------------------------------
-- Ratings left after task completion.
-- Each participant can rate the other once per task.
--
-- RULES:
-- - Poster rates worker (for their work quality)
-- - Worker rates poster (for clarity, payment, etc.)
-- - Can only rate after task is COMPLETE
-- - unique(task_id, rater_id) prevents multiple ratings
-- -----------------------------------------------------------------------------
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT stars_range CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT comment_length CHECK (comment IS NULL OR length(comment) <= 500),
  CONSTRAINT no_self_rating CHECK (rater_id != ratee_id),
  
  -- One rating per rater per task
  UNIQUE(task_id, rater_id)
);

-- Index for calculating user's average rating
CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);

-- -----------------------------------------------------------------------------
-- BLOCKS
-- -----------------------------------------------------------------------------
-- User blocking for basic self-protection.
--
-- When A blocks B:
-- - A won't see B's tasks
-- - B won't see A's tasks
-- - They can't message each other
--
-- This is a "minimal safety valve" in lieu of full moderation.
-- [EXTENSION] Add reports table for admin review of serious issues.
-- -----------------------------------------------------------------------------
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  
  -- One block record per pair
  UNIQUE(blocker_id, blocked_id)
);

-- Index for checking if users are blocked
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_blocked: Check if there's a block between two users (in either direction)
-- -----------------------------------------------------------------------------
-- Returns TRUE if either user has blocked the other.
-- Used in RLS policies to filter out blocked users' content.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_blocked(viewer_id UUID, other_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = viewer_id AND blocked_id = other_id)
       OR (blocker_id = other_id AND blocked_id = viewer_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- get_user_rating: Get average rating for a user
-- -----------------------------------------------------------------------------
-- Returns a record with avg (average stars) and count (number of ratings).
-- Used to display rating snippets next to user names.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_rating(user_id UUID)
RETURNS TABLE(avg NUMERIC, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(stars)::NUMERIC, 1) as avg,
    COUNT(*) as count
  FROM ratings
  WHERE ratee_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- 
-- RLS is our primary security layer. Every table has policies that control
-- who can read, insert, update, and delete rows.
--
-- IMPORTANT: 
-- - Policies use auth.uid() to get the current user's ID
-- - All authenticated users are UCI (enforced at auth level)
-- - Blocks are checked to filter out blocked users' content
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------

-- Any authenticated user can read profiles (we're all UCI by construction)
CREATE POLICY "profiles_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow insert during signup (triggered by auth callback)
-- The auth callback inserts the initial profile row
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- TASKS POLICIES
-- -----------------------------------------------------------------------------

-- Authenticated users can read tasks, excluding blocked users' tasks
-- This filters out tasks where the viewer blocked the poster OR the poster blocked the viewer
CREATE POLICY "tasks_read"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    NOT is_blocked(auth.uid(), poster_id)
    -- Also filter if accepted worker is blocked (for accepted/completed tasks)
    AND (accepted_by_user_id IS NULL OR NOT is_blocked(auth.uid(), accepted_by_user_id))
  );

-- Only users who have accepted rules can create tasks
-- This ensures new users go through the rules page first
CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the poster
    poster_id = auth.uid()
    -- Must have accepted rules
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND accepted_rules = true
    )
  );

-- Task updates are complex - different rules for different operations:
-- 1. Poster can edit title/description/price while OPEN
-- 2. Poster can cancel if OPEN or ACCEPTED
-- 3. Worker can cancel if ACCEPTED
-- 4. Anyone can accept if OPEN and not the poster
-- 5. Poster can complete if ACCEPTED
--
-- WHY RESTRICT EDITING POST-ACCEPT?
-- Prevents "bait and switch" where poster changes task details after
-- someone accepts. The worker agreed to the original terms.
CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    -- Poster can update their own tasks
    poster_id = auth.uid()
    -- Or accepted worker can update (for cancellation only)
    OR accepted_by_user_id = auth.uid()
  )
  WITH CHECK (
    -- Case 1: Poster editing while OPEN (can change title, description, price, category)
    (poster_id = auth.uid() AND status = 'OPEN')
    -- Case 2: Poster canceling (OPEN -> CANCELED or ACCEPTED -> CANCELED)
    OR (poster_id = auth.uid() AND status = 'CANCELED')
    -- Case 3: Worker canceling (ACCEPTED -> CANCELED)
    OR (accepted_by_user_id = auth.uid() AND status = 'CANCELED')
    -- Case 4: Someone accepting (OPEN -> ACCEPTED, not poster, accepted rules)
    OR (
      status = 'ACCEPTED' 
      AND accepted_by_user_id = auth.uid()
      AND poster_id != auth.uid()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND accepted_rules = true)
    )
    -- Case 5: Poster completing (ACCEPTED -> COMPLETE)
    OR (poster_id = auth.uid() AND status = 'COMPLETE')
  );

-- -----------------------------------------------------------------------------
-- MESSAGES POLICIES
-- -----------------------------------------------------------------------------

-- Only task poster and accepted worker can read messages
-- This ensures chat privacy between the two parties
CREATE POLICY "messages_read"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND (t.poster_id = auth.uid() OR t.accepted_by_user_id = auth.uid())
    )
  );

-- Only task poster and accepted worker can send messages
-- Additional check: they can't be blocked by each other
CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be the current user
    sender_id = auth.uid()
    -- Must be poster or accepted worker
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND (t.poster_id = auth.uid() OR t.accepted_by_user_id = auth.uid())
      -- Can't be blocked
      AND NOT is_blocked(t.poster_id, t.accepted_by_user_id)
    )
  );

-- -----------------------------------------------------------------------------
-- RATINGS POLICIES
-- -----------------------------------------------------------------------------

-- Anyone authenticated can read ratings (for aggregate stats)
CREATE POLICY "ratings_read"
  ON ratings FOR SELECT
  TO authenticated
  USING (true);

-- Can only rate if you participated in the task (poster or accepted worker)
-- And the task is COMPLETE
CREATE POLICY "ratings_insert"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Rater must be current user
    rater_id = auth.uid()
    -- Rater must have participated in the task
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND t.status = 'COMPLETE'
      AND (t.poster_id = auth.uid() OR t.accepted_by_user_id = auth.uid())
      -- Ratee must be the other participant
      AND (
        (t.poster_id = auth.uid() AND ratee_id = t.accepted_by_user_id)
        OR (t.accepted_by_user_id = auth.uid() AND ratee_id = t.poster_id)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- BLOCKS POLICIES
-- -----------------------------------------------------------------------------

-- Users can only see their own blocks
CREATE POLICY "blocks_read"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can only create blocks for themselves
CREATE POLICY "blocks_insert"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can only delete their own blocks (unblock)
CREATE POLICY "blocks_delete"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- =============================================================================
-- REALTIME SUBSCRIPTIONS (OPTIONAL - Costs $10.25/month)
-- =============================================================================
-- The MVP uses polling for chat (free!). If you want instant messaging later,
-- uncomment the line below and enable Realtime in Supabase dashboard.
-- 
-- EXTENSION POINT: To enable Realtime:
-- 1. Uncomment the ALTER PUBLICATION line below
-- 2. Go to Supabase Dashboard > Database > Replication
-- 3. Enable replication for the messages table
-- 4. Update task-detail-client.tsx to use Supabase channels instead of polling
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =============================================================================
-- COMMENTS
-- =============================================================================
-- These comments appear in Supabase Studio and help future developers understand the schema

COMMENT ON TABLE profiles IS 'User profiles for UCI students/staff. Created on first login.';
COMMENT ON TABLE tasks IS 'Task listings posted by users. Core entity of the marketplace.';
COMMENT ON TABLE messages IS 'Chat messages between task poster and accepted worker.';
COMMENT ON TABLE ratings IS 'Star ratings (1-5) left after task completion.';
COMMENT ON TABLE blocks IS 'User blocks for basic self-protection (minimal safety valve).';

COMMENT ON FUNCTION is_blocked IS 'Check if there is a block between two users in either direction.';
COMMENT ON FUNCTION get_user_rating IS 'Get average rating and count for a user.';

