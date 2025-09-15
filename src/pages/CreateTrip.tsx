import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateTrip = () => {
  const [tripName, setTripName] = useState("");
  const [yourName, setYourName] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateTripCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setTripCode(code);
  };

  const handleCreateTrip = () => {
    if (!tripName.trim() || !yourName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tripCode) {
      generateTripCode();
      return;
    }

    // Store trip data in localStorage for demo purposes
    const tripData = {
      name: tripName,
      code: tripCode,
      host: yourName,
      members: [yourName],
      expenses: [],
      created: new Date().toISOString(),
    };
    
    localStorage.setItem(`trip_${tripCode}`, JSON.stringify(tripData));
    
    toast({
      title: "Trip Created!",
      description: `Share code ${tripCode} with your friends.`,
    });
    
    navigate(`/trip/${tripCode}`);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tripCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Trip code copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Create New Trip</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        <Card className="shadow-medium border-0 bg-card">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tripName">Trip Name</Label>
              <Input
                id="tripName"
                placeholder="e.g., Barcelona Weekend"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yourName">Your Name</Label>
              <Input
                id="yourName"
                placeholder="Enter your name"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
              />
            </div>
            
            {!tripCode ? (
              <Button
                onClick={generateTripCode}
                className="w-full bg-gradient-primary hover:bg-primary-hover"
                disabled={!tripName.trim() || !yourName.trim()}
              >
                Generate Trip Code
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-surface rounded-lg border-2 border-dashed border-primary/30">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Trip Code</p>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl font-bold font-mono text-primary tracking-wide">
                        {tripCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyToClipboard}
                        className="text-primary hover:bg-primary/10"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this code with your travel companions
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={handleCreateTrip}
                  className="w-full bg-gradient-primary hover:bg-primary-hover"
                  size="lg"
                >
                  Start Trip
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {tripCode && (
          <Card className="shadow-soft border-0 bg-accent/5">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2 text-accent-foreground">What's next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Share the trip code with your friends</li>
                <li>• Start adding expenses as they happen</li>
                <li>• Track who owes what in real-time</li>
                <li>• Settle up at the end of your trip</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateTrip;