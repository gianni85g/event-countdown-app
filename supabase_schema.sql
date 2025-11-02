-- Supabase Schema for My Moments App
-- Run this in your Supabase SQL Editor to create the tables

-- First, check if tables exist and drop them if they do
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.preparations CASCADE;
DROP TABLE IF EXISTS public.moments CASCADE;

-- Create moments table
CREATE TABLE IF NOT EXISTS public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  date date NOT NULL,
  reminder_days integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create preparations table (tasks)
CREATE TABLE IF NOT EXISTS public.preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id uuid REFERENCES public.moments(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean DEFAULT false,
  owner text,
  completion_date date,
  reminder_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id uuid REFERENCES public.moments(id) ON DELETE CASCADE,
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies (run the RLS policies from supabase_rls_policies.sql)



