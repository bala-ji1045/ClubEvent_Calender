import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Users, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check role and redirect
        checkUserRole(session.user.id);
      }
    });
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles && roles.length > 0 && roles[0].role === "admin") {
      navigate("/admin");
    } else {
      navigate("/user");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-xl">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BookingFlow</span>
          </div>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Streamline Your Event Bookings
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A powerful calendar booking system with admin approval workflow. 
              Manage events, users, and bookings all in one place.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Learn More
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Calendar</h3>
              <p className="text-muted-foreground">
                Beautiful calendar interface with real-time updates and color-coded event status
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-shadow">
              <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-muted-foreground">
                Admin approval workflow for user registration and booking requests
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-shadow">
              <div className="p-3 bg-success/10 rounded-xl w-fit mb-4">
                <Zap className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-muted-foreground">
                Instant notifications and updates when bookings are approved or rejected
              </p>
            </div>
          </div>

          <div className="mt-20 p-8 rounded-2xl bg-primary/5 border">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Sign up now and experience seamless event booking management
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create Account
            </Button>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-muted-foreground">
          <p>© 2025 BookingFlow. Built with Lovable Cloud.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
