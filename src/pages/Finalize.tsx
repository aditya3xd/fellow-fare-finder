import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share, Calculator, Users, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  name: string;
  totalPaid: number;
  totalOwed: number;
  balance: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface TripData {
  name: string;
  code: string;
  host: string;
  members: string[];
  expenses: any[];
  created: string;
}

const Finalize = () => {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [memberSummary, setMemberSummary] = useState<Member[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    if (tripCode) {
      const stored = localStorage.getItem(`trip_${tripCode}`);
      if (stored) {
        const data = JSON.parse(stored) as TripData;
        setTripData(data);
        calculateFinalBalances(data);
      } else {
        navigate("/");
      }
    }
  }, [tripCode, navigate]);

  const calculateFinalBalances = (data: TripData) => {
    const summary: { [key: string]: Member } = {};
    
    // Initialize members
    data.members.forEach(member => {
      summary[member] = {
        name: member,
        totalPaid: 0,
        totalOwed: 0,
        balance: 0,
      };
    });

    // Calculate totals
    data.expenses.forEach(expense => {
      summary[expense.paidBy].totalPaid += expense.amount;
      const splitAmount = expense.amount / expense.splitAmong.length;
      expense.splitAmong.forEach(member => {
        summary[member].totalOwed += splitAmount;
      });
    });

    // Calculate balances
    Object.values(summary).forEach(member => {
      member.balance = member.totalPaid - member.totalOwed;
    });

    const members = Object.values(summary);
    setMemberSummary(members);
    calculateOptimalSettlements(members);
  };

  const calculateOptimalSettlements = (members: Member[]) => {
    const debtors = members.filter(m => m.balance < 0).map(m => ({ ...m }));
    const creditors = members.filter(m => m.balance > 0).map(m => ({ ...m }));
    const settlements: Settlement[] = [];

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: amount,
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) {
        debtors.shift();
      }
      if (creditor.balance < 0.01) {
        creditors.shift();
      }
    }

    setSettlements(settlements);
  };

  const getTotalTripCost = () => {
    return tripData?.expenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  };

  const getEqualShare = () => {
    if (!tripData || tripData.members.length === 0) return 0;
    return getTotalTripCost() / tripData.members.length;
  };

  const shareResults = async () => {
    const totalCost = getTotalTripCost();
    const shareText = `${tripData?.name} Trip Summary\n` +
      `Total Cost: $${totalCost.toFixed(2)}\n` +
      `Split among ${tripData?.members.length} people\n\n` +
      `Settlements needed:\n` +
      settlements.map(s => `${s.from} pays ${s.to}: $${s.amount.toFixed(2)}`).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tripData?.name} - Trip Settlement`,
          text: shareText,
        });
      } catch (err) {
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied!",
          description: "Settlement details copied to clipboard.",
        });
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Settlement details copied to clipboard.",
      });
    }
  };

  if (!tripData) {
    return <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }

  const totalCost = getTotalTripCost();
  const equalShare = getEqualShare();

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/trip/${tripCode}`)}
              className="mr-3 text-primary-foreground hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Trip Settlement</h1>
              <p className="text-sm opacity-90">{tripData.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={shareResults}
            className="text-primary-foreground hover:bg-white/10"
          >
            <Share className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Trip Summary */}
        <Card className="shadow-medium border-0 bg-gradient-warm">
          <CardContent className="pt-6 text-center text-white">
            <Calculator className="w-8 h-8 mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-2">Final Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-sm opacity-90">Total Trip Cost</p>
              </div>
              <div>
                <p className="text-3xl font-bold">${equalShare.toFixed(2)}</p>
                <p className="text-sm opacity-90">Per Person Share</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Balances */}
        <Card className="shadow-medium border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Individual Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberSummary.map((member) => (
              <div key={member.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  {member.balance >= -0.01 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid ${member.totalPaid.toFixed(2)} • Owes ${member.totalOwed.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={member.balance >= -0.01 ? "default" : "destructive"}
                    className={member.balance >= -0.01 ? "bg-success hover:bg-success/80" : ""}
                  >
                    {member.balance >= 0 ? "+" : ""}${member.balance.toFixed(2)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {member.balance >= -0.01 ? "Gets back" : "Still owes"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optimal Settlements */}
        {settlements.length > 0 && (
          <Card className="shadow-medium border-0">
            <CardHeader>
              <CardTitle>Recommended Settlements</CardTitle>
              <p className="text-sm text-muted-foreground">
                Simplified payments to settle all debts
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {settlements.map((settlement, index) => (
                <div key={index} className="flex items-center p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <div className="flex-1 flex items-center">
                    <span className="font-medium">{settlement.from}</span>
                    <ArrowRight className="w-4 h-4 mx-3 text-muted-foreground" />
                    <span className="font-medium">{settlement.to}</span>
                  </div>
                  <Badge className="bg-accent hover:bg-accent/80 text-accent-foreground">
                    ${settlement.amount.toFixed(2)}
                  </Badge>
                </div>
              ))}
              
              <Separator className="my-3" />
              
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <p className="text-sm font-medium text-success-foreground">
                  All debts settled with {settlements.length} payment{settlements.length !== 1 ? 's' : ''}!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {settlements.length === 0 && (
          <Card className="shadow-medium border-0">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
              <h3 className="font-semibold mb-2">All Settled!</h3>
              <p className="text-muted-foreground">
                Everyone has paid their fair share. No payments needed!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Share Button */}
        <Button
          onClick={shareResults}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Share className="w-5 h-5 mr-2" />
          Share Settlement Details
        </Button>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>
    </div>
  );
};

export default Finalize;