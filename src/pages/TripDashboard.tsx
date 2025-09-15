import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Calculator, 
  ArrowLeft, 
  Share, 
  DollarSign,
  Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  name: string;
  totalPaid: number;
  totalOwed: number;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  date: string;
}

interface TripData {
  name: string;
  code: string;
  host: string;
  members: string[];
  expenses: Expense[];
  created: string;
}

const TripDashboard = () => {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [memberSummary, setMemberSummary] = useState<Member[]>([]);

  useEffect(() => {
    if (tripCode) {
      const stored = localStorage.getItem(`trip_${tripCode}`);
      if (stored) {
        const data = JSON.parse(stored) as TripData;
        setTripData(data);
        calculateMemberSummary(data);
      } else {
        toast({
          title: "Trip not found",
          description: "This trip code doesn't exist.",
          variant: "destructive",
        });
        navigate("/");
      }
    }
  }, [tripCode, navigate, toast]);

  const calculateMemberSummary = (data: TripData) => {
    const summary: { [key: string]: Member } = {};
    
    // Initialize members
    data.members.forEach(member => {
      summary[member] = {
        name: member,
        totalPaid: 0,
        totalOwed: 0,
      };
    });

    // Calculate totals
    data.expenses.forEach(expense => {
      // Add to payer's total paid
      summary[expense.paidBy].totalPaid += expense.amount;
      
      // Distribute expense among split members
      const splitAmount = expense.amount / expense.splitAmong.length;
      expense.splitAmong.forEach(member => {
        summary[member].totalOwed += splitAmount;
      });
    });

    setMemberSummary(Object.values(summary));
  };

  const getTotalTripCost = () => {
    return tripData?.expenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  };

  const getBalance = (member: Member) => {
    return member.totalPaid - member.totalOwed;
  };

  const handleAddExpense = () => {
    navigate(`/trip/${tripCode}/add-expense`);
  };

  const handleFinalize = () => {
    navigate(`/trip/${tripCode}/finalize`);
  };

  const shareTrip = async () => {
    const shareData = {
      title: `Join ${tripData?.name} on TripMate`,
      text: `Use code: ${tripCode}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`Join ${tripData?.name} on TripMate! Use code: ${tripCode}`);
        toast({
          title: "Copied!",
          description: "Trip details copied to clipboard.",
        });
      }
    } else {
      navigator.clipboard.writeText(`Join ${tripData?.name} on TripMate! Use code: ${tripCode}`);
      toast({
        title: "Copied!",
        description: "Trip details copied to clipboard.",
      });
    }
  };

  if (!tripData) {
    return <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mr-3 text-primary-foreground hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{tripData.name}</h1>
              <p className="text-sm opacity-90">Code: {tripData.code}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={shareTrip}
            className="text-primary-foreground hover:bg-white/10"
          >
            <Share className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Trip Summary */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">${getTotalTripCost().toFixed(2)}</p>
              <p className="text-xs opacity-80">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{memberSummary.length}</p>
              <p className="text-xs opacity-80">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{tripData.expenses.length}</p>
              <p className="text-xs opacity-80">Expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Members */}
        <Card className="shadow-medium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Member Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberSummary.map((member) => {
              const balance = getBalance(member);
              return (
                <div key={member.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid ${member.totalPaid.toFixed(2)} • Owes ${member.totalOwed.toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    variant={balance >= 0 ? "default" : "destructive"}
                    className={balance >= 0 ? "bg-success hover:bg-success/80" : ""}
                  >
                    {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="shadow-medium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tripData.expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No expenses yet</p>
                <p className="text-sm">Start by adding your first expense</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tripData.expenses.slice(-5).reverse().map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Paid by {expense.paidBy} • Split {expense.splitAmong.length} ways
                      </p>
                    </div>
                    <p className="font-semibold text-lg">${expense.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-surface border-t space-y-3">
        <Button
          onClick={handleAddExpense}
          className="w-full bg-gradient-primary hover:bg-primary-hover shadow-medium"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </Button>
        
        {tripData.expenses.length > 0 && (
          <Button
            onClick={handleFinalize}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Finalize & Settle Up
          </Button>
        )}
      </div>

      {/* Bottom padding for fixed buttons */}
      <div className="h-32"></div>
    </div>
  );
};

export default TripDashboard;