-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trips table with currency support
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip members table with join request status
CREATE TYPE public.member_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE public.trip_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.member_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(trip_id, user_id)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense splits table (who the expense applies to)
CREATE TABLE public.expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Create payments table for payment confirmations
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'disputed');

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  payee_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for trips
CREATE POLICY "Users can view trips they are members of" ON public.trips FOR SELECT 
USING (
  auth.uid() = host_id OR 
  EXISTS (
    SELECT 1 FROM public.trip_members tm 
    WHERE tm.trip_id = id AND tm.user_id = auth.uid() AND tm.status = 'approved'
  )
);

CREATE POLICY "Users can create trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Trip hosts can update their trips" ON public.trips FOR UPDATE USING (auth.uid() = host_id);

-- Create RLS policies for trip_members
CREATE POLICY "Users can view members of trips they belong to" ON public.trip_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = trip_id AND (
      t.host_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM public.trip_members tm2 
        WHERE tm2.trip_id = t.id AND tm2.user_id = auth.uid() AND tm2.status = 'approved'
      )
    )
  )
);

CREATE POLICY "Users can request to join trips" ON public.trip_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Trip hosts can update member status" ON public.trip_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = trip_id AND t.host_id = auth.uid()
  )
);

-- Create RLS policies for expenses
CREATE POLICY "Trip members can view expenses" ON public.expenses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm 
    WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid() AND tm.status = 'approved'
  ) OR
  EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = trip_id AND t.host_id = auth.uid()
  )
);

CREATE POLICY "Trip members can create expenses" ON public.expenses FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND (
    EXISTS (
      SELECT 1 FROM public.trip_members tm 
      WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid() AND tm.status = 'approved'
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_id AND t.host_id = auth.uid()
    )
  )
);

-- Create RLS policies for expense_splits
CREATE POLICY "Trip members can view expense splits" ON public.expense_splits FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.trip_members tm ON e.trip_id = tm.trip_id
    WHERE e.id = expense_id AND tm.user_id = auth.uid() AND tm.status = 'approved'
  ) OR
  EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.trips t ON e.trip_id = t.id
    WHERE e.id = expense_id AND t.host_id = auth.uid()
  )
);

CREATE POLICY "Users can create expense splits" ON public.expense_splits FOR INSERT WITH CHECK (true);

-- Create RLS policies for payments
CREATE POLICY "Users can view their payments" ON public.payments FOR SELECT 
USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "Users can create payments" ON public.payments FOR INSERT 
WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Payees can update payment status" ON public.payments FOR UPDATE 
USING (auth.uid() = payee_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.trip_members REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.expense_splits REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();