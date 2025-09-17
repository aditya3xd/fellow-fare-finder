import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
  const location = useLocation(); // Get location object for state
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [memberSummary, setMemberSummary] = useState<MemberSummary>({});
  const [loading, setLoading] = useState(true);
  const { getTripByCode, joinTrip } = useTrips();
  const { user, loading: authLoading } = useAuth();
  
  const userName = searchParams.get('userName');

  useEffect(() => {
    const loadTripData = async () => {
      if (authLoading) return;
      if (!user) {
        navigate('/auth');
        return;
      }
      if (!tripCode) return;

      try {
        setLoading(true);

        // --- FIX: Check for passed state first to avoid the race condition ---
        if (location.state?.tripData) {
          const passedTrip = location.state.tripData;
          setTripData({
            ...passedTrip,
            members: passedTrip.trip_members
          });
          if (passedTrip.expenses) {
            calculateMemberSummary(passedTrip.expenses, passedTrip.trip_members || []);
          }
        } else {
          // If no state is passed, fetch from the database
          if (userName) {
            await joinTrip(tripCode, userName);
          }
          const trip = await getTripByCode(tripCode);
          setTripData({
            ...trip,
            members: trip.trip_members
          });
          if (trip.expenses) {
            calculateMemberSummary(trip.expenses, trip.trip_members || []);
          }
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

    loadTripData();
  }, [tripCode, userName, user, authLoading, getTripByCode, joinTrip, toast, navigate, location.state]);

  const calculateMemberSummary = (expenses: ExpenseData[], members: MemberData[]) => {
    const summary: MemberSummary = {};
    const allMemberIds = [tripData?.host_id, ...members.map(m => m.user_id)].filter(Boolean);

    allMemberIds.forEach(id => {
        summary[id!] = { paid: 0, owed: 0 };
    });

    expenses.forEach(expense => {
      if (summary[expense.paid_by]) {
        summary[expense.paid_by].paid += expense.amount;
      }
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
    const member = tripData?.members?.find(m => m.user_id === userId);
    return member?.profiles?.display_name || 'Unknown Member';
  };

  const handleAddExpense = () => {
    navigate(`/trip/${tripCode}/add-expense`);
  };

  const handleFinalize = () => {
    navigate(`/trip/${tripCode}/finalize`);
  };

  const shareTrip = async () => {
    const shareUrl = `${window.location.origin}/join/${tripCode}`;
    const shareText = `Join my trip "${tripData?.name}" on TripMate! Click the link or use the code: ${tripCode}`;
    
    try {
        await navigator.clipboard.writeText(shareText + `\n${shareUrl}`);
        toast({
            title: "Link Copied!",
            description: "An invite link has been copied to your clipboard.",
        });
    } catch (error) {
        toast({
            title: "Share Failed",
            description: `Please share the trip code manually: ${tripCode}`,
            variant: "destructive",
        });
    }
  };

  if (loading || authLoading) {
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
              <p className="text-lg font-bold text-foreground">{tripData.members?.length || 0}</p>
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

        <Card className="shadow-medium border-0 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Member Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tripData.members?.map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    {member.profiles?.display_name}
                    {member.user_id === tripData.host_id && " (Host)"}
                  </p>
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
          </CardContent>
        </Card>

        {/* ... (rest of the component is the same) ... */}
      </div>

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
