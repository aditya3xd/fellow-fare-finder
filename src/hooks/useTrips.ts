import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface TripData {
  id: string;
  name: string;
  code: string;
  currency: string;
  currency_symbol: string;
  host_id: string;
  created_at: string;
  expenses?: ExpenseData[];
  members?: MemberData[];
  trip_members?: any; // To handle raw data
}

export interface ExpenseData {
  id: string;
  name: string;
  amount: number;
  currency: string;
  paid_by: string;
  trip_id: string;
  created_by: string;
  created_at: string;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
}

export interface MemberData {
  id: string;
  user_id: string;
  trip_id: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  approved_at?: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

export function useTrips() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createTrip = async (tripData: { name: string; yourName: string }) => {
    if (!user) throw new Error('User must be authenticated');

    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripData.name,
          code,
          host_id: user.id,
          currency: 'USD',
          currency_symbol: '$'
        })
        .select()
        .single();

      if (tripError) throw tripError;

      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: tripData.yourName
        });

      const { data: member, error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          status: 'approved'
        })
        .select(`*, profiles(display_name)`)
        .single();
        
      if (memberError) throw memberError;

      return { ...trip, trip_members: [member] };

    } catch (error: any) {
      toast({
        title: 'Error creating trip',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTripByCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_trip_details', {
        trip_code_input: code
      });

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Error getting trip by code:', error);
      toast({
        title: "Error",
        description: "Could not retrieve trip details. You may not be a member of this trip.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const joinTrip = async (tripCode: string, userName: string) => {
    if (!user) throw new Error('User must be authenticated');

    setLoading(true);
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, host_id')
        .eq('code', tripCode)
        .single();

      if (tripError) throw tripError;
      if (!trip) throw new Error('Trip not found');

      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: userName
        });

      if (trip.host_id === user.id) {
        return trip;
      }

      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id
        });

      if (memberError && memberError.code !== '23505') {
        throw memberError;
      }

      return trip;
    } catch (error: any) {
      toast({
        title: 'Error joining trip',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expenseData: {
    name: string;
    amount: number;
    paidBy: string;
    splitAmong: string[];
    tripId: string;
  }) => {
    if (!user) throw new Error('User must be authenticated');

    setLoading(true);
    try {
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          name: expenseData.name,
          amount: expenseData.amount,
          currency: 'USD',
          paid_by: expenseData.paidBy,
          trip_id: expenseData.tripId,
          created_by: user.id
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const splitAmount = expenseData.amount / expenseData.splitAmong.length;
      const splits = expenseData.splitAmong.map(userId => ({
        expense_id: expense.id,
        user_id: userId,
        amount: splitAmount
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitsError) throw splitsError;

      return expense;
    } catch (error: any) {
      toast({
        title: 'Error adding expense',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTrip,
    getTripByCode,
    joinTrip,
    addExpense,
    loading
  };
} // <-- This is the closing brace that was likely missing.
