import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TripData {
  name: string;
  code: string;
  host: string;
  members: string[];
  expenses: any[];
  created: string;
}

const AddExpense = () => {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);

  useEffect(() => {
    if (tripCode) {
      const stored = localStorage.getItem(`trip_${tripCode}`);
      if (stored) {
        const data = JSON.parse(stored) as TripData;
        setTripData(data);
        // Default to splitting among all members
        setSplitAmong(data.members);
      } else {
        navigate("/");
      }
    }
  }, [tripCode, navigate]);

  const handleMemberToggle = (memberName: string, checked: boolean) => {
    if (checked) {
      setSplitAmong(prev => [...prev, memberName]);
    } else {
      setSplitAmong(prev => prev.filter(name => name !== memberName));
    }
  };

  const handleSubmit = () => {
    if (!expenseName.trim() || !amount || !paidBy || splitAmong.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and select at least one person to split with.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    const newExpense = {
      id: Date.now().toString(),
      name: expenseName,
      amount: amountNum,
      paidBy,
      splitAmong,
      date: new Date().toISOString(),
    };

    if (tripData) {
      const updatedTrip = {
        ...tripData,
        expenses: [...tripData.expenses, newExpense],
      };
      
      localStorage.setItem(`trip_${tripCode}`, JSON.stringify(updatedTrip));
      
      toast({
        title: "Expense Added!",
        description: `${expenseName} ($${amountNum.toFixed(2)}) has been recorded.`,
      });
      
      navigate(`/trip/${tripCode}`);
    }
  };

  if (!tripData) {
    return <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }

  const splitPerPerson = amount ? (parseFloat(amount) / splitAmong.length).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/trip/${tripCode}`)}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Add Expense</h1>
          <p className="text-sm text-muted-foreground">{tripData.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Expense Details */}
        <Card className="shadow-medium border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expenseName">What was this for?</Label>
              <Input
                id="expenseName"
                placeholder="e.g., Dinner at restaurant"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Who paid?</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {tripData.members.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Split Among */}
        <Card className="shadow-medium border-0">
          <CardHeader>
            <CardTitle>Split this expense among:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tripData.members.map((member) => (
              <div key={member} className="flex items-center space-x-3">
                <Checkbox
                  id={member}
                  checked={splitAmong.includes(member)}
                  onCheckedChange={(checked) => handleMemberToggle(member, checked as boolean)}
                />
                <Label htmlFor={member} className="flex-1 cursor-pointer">
                  {member}
                </Label>
              </div>
            ))}
            
            {splitAmong.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Each person pays: <span className="font-semibold text-foreground">${splitPerPerson}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Split among {splitAmong.length} {splitAmong.length === 1 ? 'person' : 'people'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-surface border-t">
        <Button
          onClick={handleSubmit}
          className="w-full bg-gradient-primary hover:bg-primary-hover shadow-medium"
          size="lg"
          disabled={!expenseName || !amount || !paidBy || splitAmong.length === 0}
        >
          Add Expense
        </Button>
      </div>

      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
};

export default AddExpense;