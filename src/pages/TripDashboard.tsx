import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Share2, Users, Receipt, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrips, type TripData, type ExpenseData, type MemberData } from "@/hooks/useTrips";
import { useAuth } from "@/components/auth/AuthProvider";

interface MemberSummary {
  [key: string]: {
    paid: number;
    owed: number;
  };
}

const TripDashboard = () => {
  const { tripCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [memberSummary, setMemberSummary] = useState<MemberSummary>({});
  const [loading, setLoading] = useState(true);
  const { getTripByCode, joinTrip } = useTrips();
  const { user } = useAuth();
  
  const userName = searchParams.get('userName');

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripCode) return;
      
      try {
        setLoading(true);
        
        // If userName is provided, join the trip first
        if (userName && user) {
          await joinTrip(tripCode, userName);
        }
        
        const trip = await getTripByCode(tripCode);
        setTripData({
          ...trip,
          members: trip.trip_members  // Map trip_members to members
        });
        
        if (trip.expenses) {
          calculateMemberSummary(trip.expenses, trip.trip_members || []);
        }
      } catch (error: any) {
        console.error('Error loading trip:', error);
        toast({
          title: "Trip Not Found",
          description: "The trip code you entered doesn't exist or you don't have access to it.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadTripData();
    }
  }, [tripCode, userName, user, getTripByCode, joinTrip, toast, navigate]);

  const calculateMemberSummary = (expenses: ExpenseData[], members: MemberData[]) => {
    const summary: MemberSummary = {};
    
    // Initialize summary for all members
    members.forEach(member => {
      if (member.profiles?.display_name) {
        summary[member.user_id] = { paid: 0, owed: 0 };
      }
    });

    expenses.forEach(expense => {
      // Add to paid amount for the person who paid
      if (summary[expense.paid_by]) {
        summary[expense.paid_by].paid += expense.amount;
      }

      // Add to owed amount for each person in the split
      if (expense.splits) {
        expense.splits.forEach(split => {
          if (summary[split.user_id]) {
            summary[split.user_id].owed += split.amount;
          }
        });
      }
    });

    setMemberSummary(summary);
  };

  const getTotalTripCost = () => {
    return tripData?.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  };

  const getBalance = (userId: string) => {
    const summary = memberSummary[userId];
    return summary ? summary.paid - summary.owed : 0;
  };

  const getMemberName = (userId: string) => {
    // Check if it's the host
    if (userId === tripData?.host_id) {
      // Find host profile in trip_members or use fallback
      const hostMember = tripData?.members?.find(m => m.user_id === userId);
      return hostMember?.profiles?.display_name || 'Host';
    }
    
    const member = tripData?.members?.find(m => m.user_id === userId);
    return member?.profiles?.display_name || 'Unknown';
  };

  const handleAddExpense = () => {
    navigate(`/trip/${tripCode}/add-expense`);
  };

  const handleFinalize = () => {
    navigate(`/trip/${tripCode}/finalize`);
  };

  const shareTrip = async () => {
    const shareData = {
      title: `Join my trip: ${tripData?.name}`,
      text: `Use code ${tripCode} to join my trip "${tripData?.name}" on TripMate!`,
      url: window.location.origin,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      console.log('Share failed, falling back to clipboard');
    }

    try {
      await navigator.clipboard.writeText(`Join my trip "${tripData?.name}" on TripMate! Use code: ${tripCode}\n\n${window.location.origin}`);
      toast({
        title: "Link Copied!",
        description: "Trip details have been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Please share the trip code manually: " + tripCode,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-surface pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{tripData.name}</h1>
              <p className="text-sm text-muted-foreground">Code: {tripData.code}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={shareTrip}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-soft border-0 bg-card">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">${getTotalTripCost().toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 bg-card">
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{(tripData.members?.length || 0) + 1}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 bg-card">
            <CardContent className="p-3 text-center">
              <Receipt className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{tripData.expenses?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Member Balances */}
        <Card className="shadow-medium border-0 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Member Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Host balance */}
            <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{getMemberName(tripData.host_id)} (Host)</p>
                <p className="text-sm text-muted-foreground">
                  Paid ${(memberSummary[tripData.host_id]?.paid || 0).toFixed(2)} • 
                  Owes ${(memberSummary[tripData.host_id]?.owed || 0).toFixed(2)}
                </p>
              </div>
              <Badge variant={getBalance(tripData.host_id) >= 0 ? "default" : "destructive"}>
                {getBalance(tripData.host_id) >= 0 ? '+' : ''}${getBalance(tripData.host_id).toFixed(2)}
              </Badge>
            </div>

            {/* Member balances */}
            {tripData.members?.filter(member => member.status === 'approved').map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{member.profiles?.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Paid ${(memberSummary[member.user_id]?.paid || 0).toFixed(2)} • 
                    Owes ${(memberSummary[member.user_id]?.owed || 0).toFixed(2)}
                  </p>
                </div>
                <Badge variant={getBalance(member.user_id) >= 0 ? "default" : "destructive"}>
                  {getBalance(member.user_id) >= 0 ? '+' : ''}${getBalance(member.user_id).toFixed(2)}
                </Badge>
              </div>
            ))}

            {/* Pending members */}
            {tripData.members?.filter(member => member.status === 'pending').map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 bg-warning/10 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{member.profiles?.display_name}</p>
                  <p className="text-sm text-muted-foreground">Pending approval</p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="shadow-medium border-0 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {tripData.expenses && tripData.expenses.length > 0 ? (
              <div className="space-y-3">
                {tripData.expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-start p-3 bg-secondary/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{expense.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Paid by {getMemberName(expense.paid_by)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${expense.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Split {expense.splits?.length || 0} ways
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No expenses yet</p>
                <p className="text-sm text-muted-foreground">Add your first expense to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-md mx-auto flex space-x-3">
          <Button 
            onClick={handleAddExpense}
            className="flex-1 bg-gradient-primary hover:bg-primary-hover shadow-soft"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
          <Button 
            onClick={handleFinalize}
            variant="outline"
            className="flex-1"
          >
            Settle Up
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripDashboard;