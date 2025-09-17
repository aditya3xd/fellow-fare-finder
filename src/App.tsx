import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateTrip from "./pages/CreateTrip";
import TripDashboard from "./pages/TripDashboard";
import AddExpense from "./pages/AddExpense";
import Finalize from "./pages/Finalize";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
            <Route path="/trip/:tripCode" element={<ProtectedRoute><TripDashboard /></ProtectedRoute>} />
            <Route path="/trip/:tripCode/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
            <Route path="/trip/:tripCode/finalize" element={<ProtectedRoute><Finalize /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
