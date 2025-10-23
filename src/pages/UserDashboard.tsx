import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LogOut, Plus } from "lucide-react";
import Calendar from "@/components/Calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const UserDashboard = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    fetchEvents();
    fetchMyRequests();

    // Subscribe to realtime changes
    const eventsSubscription = supabase
      .channel('user-events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
        fetchMyRequests();
      })
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
    };
  }, []);

  const fetchEvents = async () => {
    // Fetch only approved events for calendar view
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "approved")
      .order("event_date", { ascending: true });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setEvents(data || []);
    }
  };

  const fetchMyRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setMyRequests(data || []);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      ...newRequest,
      requested_by: user.id,
      status: "pending",
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Booking request submitted! Waiting for admin approval." });
      setShowNewRequestDialog(false);
      setNewRequest({ title: "", description: "", event_date: "", start_time: "", end_time: "" });
      fetchMyRequests();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">My Bookings</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Calendar View</h2>
            <p className="text-muted-foreground">View approved events and request new bookings</p>
          </div>
          <Button onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Booking
          </Button>
        </div>

        <Calendar
          events={events}
          onDateClick={(date) => {
            setSelectedDate(date);
            setNewRequest(prev => ({ ...prev, event_date: date.toISOString().split('T')[0] }));
            setShowNewRequestDialog(true);
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>My Booking Requests</CardTitle>
            <CardDescription>Track the status of your booking requests</CardDescription>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No booking requests yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowNewRequestDialog(true)}
                >
                  Create your first request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          📅 {new Date(request.event_date).toLocaleDateString()}
                        </span>
                        {request.start_time && (
                          <span className="text-muted-foreground">
                            🕐 {request.start_time} - {request.end_time}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request New Booking</DialogTitle>
            <DialogDescription>
              Submit your booking request for admin approval
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="e.g., Team Meeting"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide details about your event..."
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                type="date"
                value={newRequest.event_date}
                onChange={(e) => setNewRequest({ ...newRequest, event_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newRequest.start_time}
                  onChange={(e) => setNewRequest({ ...newRequest, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newRequest.end_time}
                  onChange={(e) => setNewRequest({ ...newRequest, end_time: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;