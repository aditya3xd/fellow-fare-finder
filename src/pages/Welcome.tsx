import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, LogIn, Plane, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

const Welcome = () => {
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleCreateTrip = () => {
    navigate("/create-trip");
  };

  const handleJoinTrip = () => {
    if (joinCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid trip code.",
        variant: "destructive",
      });
      return;
    }
    
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join the trip.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/trip/${joinCode}?userName=${encodeURIComponent(userName)}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full shadow-medium">
              <Plane className="w-8 h-8 text-primary-foreground" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">TripMate</h1>
          <p className="text-muted-foreground">Welcome back! Split expenses fairly with friends</p>
        </div>

        {/* Main Actions */}
        {!showJoin ? (
          <Card className="shadow-medium border-0 bg-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold">Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleCreateTrip}
                className="w-full bg-gradient-primary hover:bg-primary-hover shadow-soft"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Trip
              </Button>
              
              <Button 
                onClick={() => setShowJoin(true)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Join Existing Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-medium border-0 bg-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold flex items-center justify-center">
                <Users className="w-5 h-5 mr-2" />
                Join Trip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Trip Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userName">Your Name</Label>
                <Input
                  id="userName"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setShowJoin(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleJoinTrip}
                  className="flex-1 bg-gradient-primary hover:bg-primary-hover"
                  disabled={loading || authLoading}
                >
                  {loading ? "Joining..." : "Join Trip"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">Track Group Expenses</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Plus className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">Add Expenses Easily</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Fair Split Calculation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;