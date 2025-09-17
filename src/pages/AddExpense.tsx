import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrips, type TripData } from "@/hooks/useTrips";
import { useAuth } from "@/components/auth/AuthProvider";

const AddExpense = () => {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { getTripByCode, addExpense, loading: submitLoading } = useTrips();
  const { user } = useAuth();

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripCode || !user) return;
      
      try {
        const trip = await getTripByCode(tripCode);
        if (trip && typeof trip === 'object') {
          setTripData({
            ...trip,
            members: trip.trip_members || []
          });
        } else {
          throw new Error('Invalid trip data received');
        }
        
        // Set current user as default payer
        setPaidBy(user.id);
      } catch (error: any) {
        console.error('Error loading trip:', error);
        toast({
          title: "Trip Not Found",
          description: "Could not load trip data.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [tripCode, user, getTripByCode, toast, navigate]);

  const handleMemberToggle = (userId: string, checked: boolean) => {
    setSplitAmong(prev => {
      if (checked) {
        return [...prev, userId];
      } else {
        return prev.filter(id => id !== userId);
      }
    });
  };

  const handleSubmit = async () => {
    if (!expenseName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an expense name.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!paidBy) {
      toast({
        title: "Missing Information",
        description: "Please select who paid for this expense.",
        variant: "destructive",
      });
      return;
    }

    if (splitAmong.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one person to split this expense among.",
        variant: "destructive",
      });
      return;
    }

    if (!tripData) return;

    try {
      await addExpense({
        name: expenseName,
        amount: amount,
        paidBy: paidBy,
        splitAmong: splitAmong,
        tripId: tripData.id
      });

      toast({
        title: "Expense Added!",
        description: `"${expenseName}" has been added successfully.`,
      });
      
      navigate(`/trip/${tripCode}`);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getMemberName = (userId: string) => {
    if (userId === tripData?.host_id) {
      const hostMember = tripData?.members?.find(m => m.user_id === userId);
      return hostMember?.profiles?.display_name || 'Host';
    }
    
    const member = tripData?.members?.find(m => m.user_id === userId);
    return member?.profiles?.display_name || 'Unknown';
  };

  const getAmountPerPerson = () => {
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || splitAmong.length === 0) return 0;
    return amount / splitAmong.length;
  };

  const getAllMembers = () => {
    if (!tripData) return [];
    
    // Include host and all approved members
    const allMembers = [{
      user_id: tripData.host_id,
      profiles: { display_name: getMemberName(tripData.host_id) }
    }];
    
    tripData.members?.forEach(member => {
      if (member.status === 'approved' && member.profiles) {
        allMembers.push(member as any);
      }
    });
    
    return allMembers;
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

  const allMembers = getAllMembers();

  return (
    <div className="min-h-screen bg-gradient-surface pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/trip/${tripCode}`)}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Add Expense</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Expense Details */}
        <Card className="shadow-medium border-0 bg-card">
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expenseName">Expense Name</Label>
              <Input
                id="expenseName"
                placeholder="e.g., Dinner at restaurant"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Amount ($)</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Who Paid?</Label>
              <div className="space-y-2">
                {allMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`payer-${member.user_id}`}
                      name="paidBy"
                      value={member.user_id}
                      checked={paidBy === member.user_id}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <Label htmlFor={`payer-${member.user_id}`} className="flex-1">
                      {member.profiles?.display_name}
                      {member.user_id === tripData.host_id && " (Host)"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split Among */}
        <Card className="shadow-medium border-0 bg-card">
          <CardHeader>
            <CardTitle>Split Among</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allMembers.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`split-${member.user_id}`}
                    checked={splitAmong.includes(member.user_id)}
                    onCheckedChange={(checked) => 
                      handleMemberToggle(member.user_id, checked as boolean)
                    }
                  />
                  <Label htmlFor={`split-${member.user_id}`}>
                    {member.profiles?.display_name}
                    {member.user_id === tripData.host_id && " (Host)"}
                  </Label>
                </div>
                {splitAmong.includes(member.user_id) && (
                  <span className="text-sm text-muted-foreground">
                    ${getAmountPerPerson().toFixed(2)}
                  </span>
                )}
              </div>
            ))}
            
            {splitAmong.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Each person pays: <span className="font-semibold text-foreground">
                    ${getAmountPerPerson().toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Add Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handleSubmit}
            className="w-full bg-gradient-primary hover:bg-primary-hover shadow-soft"
            disabled={!expenseName.trim() || !expenseAmount || !paidBy || splitAmong.length === 0 || submitLoading}
          >
            {submitLoading ? "Adding Expense..." : "Add Expense"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;