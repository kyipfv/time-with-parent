-- ParentOS Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parents table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    relationship TEXT CHECK(relationship IN ('mom', 'dad', 'guardian')),
    personality JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    challenges JSONB DEFAULT '[]'::jsonb,
    communication_style TEXT CHECK(communication_style IN ('calls', 'texts', 'visits', 'emails')),
    relationship_goals JSONB DEFAULT '[]'::jsonb,
    last_contact TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    doctor TEXT NOT NULL,
    specialty TEXT NOT NULL,
    location TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT DEFAULT '',
    completed BOOLEAN DEFAULT FALSE,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical notes table
CREATE TABLE IF NOT EXISTS public.medical_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT CHECK(type IN ('appointment', 'medication', 'symptom', 'general')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation logs table (for future features)
CREATE TABLE IF NOT EXISTS public.conversation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT CHECK(type IN ('call', 'text', 'visit', 'email')),
    duration INTEGER,
    notes TEXT,
    mood_rating INTEGER CHECK(mood_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_parent_id ON public.appointments(parent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_completed ON public.appointments(completed);
CREATE INDEX IF NOT EXISTS idx_medical_notes_parent_id ON public.medical_notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_medical_notes_date ON public.medical_notes(date);
CREATE INDEX IF NOT EXISTS idx_medical_notes_type ON public.medical_notes(type);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_parent_id ON public.conversation_logs(parent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only see and modify their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Parents policies
CREATE POLICY "Users can view own parents" ON public.parents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parents" ON public.parents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parents" ON public.parents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own parents" ON public.parents
    FOR DELETE USING (auth.uid() = user_id);

-- Appointments policies
CREATE POLICY "Users can view appointments for their parents" ON public.appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = appointments.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert appointments for their parents" ON public.appointments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = appointments.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update appointments for their parents" ON public.appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = appointments.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete appointments for their parents" ON public.appointments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = appointments.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

-- Medical notes policies
CREATE POLICY "Users can view medical notes for their parents" ON public.medical_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = medical_notes.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert medical notes for their parents" ON public.medical_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = medical_notes.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update medical notes for their parents" ON public.medical_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = medical_notes.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete medical notes for their parents" ON public.medical_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = medical_notes.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

-- Conversation logs policies
CREATE POLICY "Users can view conversation logs for their parents" ON public.conversation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = conversation_logs.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversation logs for their parents" ON public.conversation_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = conversation_logs.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update conversation logs for their parents" ON public.conversation_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = conversation_logs.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete conversation logs for their parents" ON public.conversation_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.parents 
            WHERE parents.id = conversation_logs.parent_id 
            AND parents.user_id = auth.uid()
        )
    );

-- Create a function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;