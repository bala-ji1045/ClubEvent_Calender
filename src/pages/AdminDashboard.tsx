import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Users, CalendarDays, LogOut, CheckCircle, XCircle } from "lucide-react";
import Calendar from "@/components/Calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, pendingRequests: 0, upcomingEvents: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime changes
    const eventsSubscription = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      profilesSubscription.unsubscribe();
    };
  }, []);

  const fetchData = () => {
    fetchUsers();
    fetchEvents();
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setUsers(data || []);
      setStats(prev => ({
        ...prev,
        totalUsers: data?.length || 0,
        pendingRequests: data?.filter(u => u.approval_status === "pending").length || 0,
      }));
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setEvents(data || []);
      setStats(prev => ({
        ...prev,
        upcomingEvents: data?.filter(e => new Date(e.event_date) >= new Date() && e.status === "approved").length || 0,
      }));
    }
  };

  const handleApproveUser = async (userId: string) => {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", userId);

    if (profileError) {
      toast({ variant: "destructive", title: "Error", description: profileError.message });
      return;
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });

    if (roleError) {
      toast({ variant: "destructive", title: "Error", description: roleError.message });
    } else {
      toast({ title: "Success", description: "User approved successfully" });
      fetchUsers();
    }
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", userId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "User rejected" });
      fetchUsers();
    }
  };

  const handleEventStatusUpdate = async (eventId: string, status: string) => {
    const { error } = await supabase
      .from("events")
      .update({ status })
      .eq("id", eventId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: `Event ${status}` });
      fetchEvents();
      setShowEventDialog(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      ...newEvent,
      requested_by: user.id,
      status: "approved", // Admin-created events are auto-approved
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Event created successfully" });
      setShowNewEventDialog(false);
      setNewEvent({ title: "", description: "", event_date: "", start_time: "", end_time: "" });
      fetchEvents();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Event deleted" });
      fetchEvents();
      setShowEventDialog(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowNewEventDialog(true)}>
                  Add New Event
                </Button>
              </div>
              <Calendar
                events={events}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setNewEvent(prev => ({ ...prev, event_date: date.toISOString().split('T')[0] }));
                  setShowNewEventDialog(true);
                }}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setShowEventDialog(true);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Approve or reject user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          user.approval_status === "approved" ? "default" :
                          user.approval_status === "pending" ? "secondary" : "destructive"
                        }>
                          {user.approval_status}
                        </Badge>
                        {user.approval_status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleApproveUser(user.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectUser(user.id)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Requests</CardTitle>
                <CardDescription>Manage booking requests from users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.event_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          event.status === "approved" ? "default" :
                          event.status === "pending" ? "secondary" : "destructive"
                        }>
                          {event.status}
                        </Badge>
                        {event.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleEventStatusUpdate(event.id, "approved")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleEventStatusUpdate(event.id, "rejected")}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Date: {selectedEvent?.event_date}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{selectedEvent?.description || "No description"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p>{selectedEvent?.start_time} - {selectedEvent?.end_time}</p>
            </div>
            <div>
              <Badge>{selectedEvent?.status}</Badge>
            </div>
            <div className="flex gap-2">
              {selectedEvent?.status === "pending" && (
                <>
                  <Button onClick={() => handleEventStatusUpdate(selectedEvent.id, "approved")} className="flex-1">
                    Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleEventStatusUpdate(selectedEvent.id, "rejected")} className="flex-1">
                    Reject
                  </Button>
                </>
              )}
              <Button variant="destructive" onClick={() => handleDeleteEvent(selectedEvent?.id)}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Add a new event to the calendar</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                type="date"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">Create Event</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;