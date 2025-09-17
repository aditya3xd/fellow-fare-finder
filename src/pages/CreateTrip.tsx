import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrips, type TripData } from "@/hooks/useTrips"; // Import TripData
import { useAuth } from "@/components/auth/AuthProvider";

const CreateTrip = () => {
  const [tripName, setTripName] = useState("");
  const [yourName, setYourName] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [copied, setCopied] = useState(false);
  
  // --- FIX: Add state to hold the new trip data ---
  const [newTripData, setNewTripData] = useState<TripData | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTrip, loading } = useTrips();
  const { user } = useAuth();

  // --- FIX: This function now stores the created trip data ---
  const handleCreateTrip = async () => {
    if (!tripName.trim() || !yourName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both trip name and your name.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const trip = await createTrip({
        name: tripName,
        yourName: yourName
      });

      setTripCode(trip.code);
      setNewTripData(trip); // Store the full trip object
      
      toast({
        title: "Trip Created!",
        description: `Your trip "${tripName}" has been created successfully.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tripCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Trip code has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy the trip code manually.",
        variant: "destructive",
      });
    }
  };

  // --- FIX: This function now passes the stored data on navigation ---
  const handleStartTrip = () => {
    navigate(`/trip/${tripCode}`, { state: { tripData: newTripData } });
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Create Trip</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        <Card className="shadow-medium border-0 bg-card mt-6">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tripName">Trip Name</Label>
              <Input
                id="tripName"
                placeholder="e.g., Weekend in Paris"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                disabled={!!tripCode}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yourName">Your Name</Label>
              <Input
                id="yourName"
                placeholder="Enter your name"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                disabled={!!tripCode}
              />
            </div>

            {!tripCode ? (
              <Button 
                onClick={handleCreateTrip}
                className="w-full bg-gradient-primary hover:bg-primary-hover shadow-soft mt-6"
                disabled={loading}
              >
                {loading ? "Creating Trip..." : "Create Trip"}
              </Button>
            ) : (
              <div className="space-y-4 mt-6">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Trip Code</p>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl font-mono font-bold text-foreground">{tripCode}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyToClipboard}
                        className="h-8 w-8"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Share this code with your travel buddies</p>
                  </div>
                </div>

                <Button 
                  onClick={handleStartTrip}
                  className="w-full bg-gradient-primary hover:bg-primary-hover shadow-soft"
                >
                  Start Trip
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTrip;
