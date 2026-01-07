import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gamepad2, Users, Play, Plus, Trophy, Clock, 
  Brain, MessageSquare, Puzzle, BookOpen
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GameRoom {
  id: string;
  game_type: string;
  title: string;
  max_players: number;
  current_players: number;
  status: string;
  host_id: string;
  created_at: string;
  host_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const GAME_TYPES = [
  { id: "trivia", label: "Trivia Challenge", icon: Brain, color: "from-blue-500 to-cyan-500" },
  { id: "quiz", label: "Quick Quiz", icon: BookOpen, color: "from-green-500 to-emerald-500" },
  { id: "word_game", label: "Word Games", icon: MessageSquare, color: "from-purple-500 to-pink-500" },
  { id: "puzzle", label: "Puzzle Match", icon: Puzzle, color: "from-orange-500 to-yellow-500" },
];

export function ChatMateGameMatching() {
  const { user } = useAuth();
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    title: "",
    game_type: "trivia",
    max_players: 4
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGameRooms();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("game-rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatmate_game_rooms" },
        () => fetchGameRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGameRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("chatmate_game_rooms")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get host profiles
      if (data && data.length > 0) {
        const hostIds = [...new Set(data.map(r => r.host_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", hostIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        
        const roomsWithProfiles = data.map(room => ({
          ...room,
          host_profile: profileMap.get(room.host_id)
        }));

        setGameRooms(roomsWithProfiles);
      } else {
        setGameRooms([]);
      }
    } catch (error) {
      console.error("Error fetching game rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGameRoom = async () => {
    if (!user || !newGame.title.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("chatmate_game_rooms")
        .insert({
          title: newGame.title,
          game_type: newGame.game_type,
          max_players: newGame.max_players,
          host_id: user.id,
          current_players: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase
        .from("chatmate_game_participants")
        .insert({
          game_room_id: data.id,
          user_id: user.id
        });

      toast.success("Game room created!", {
        description: "Waiting for players to join..."
      });
      setCreateDialogOpen(false);
      setNewGame({ title: "", game_type: "trivia", max_players: 4 });
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game room");
    } finally {
      setCreating(false);
    }
  };

  const joinGameRoom = async (roomId: string) => {
    if (!user) return;

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from("chatmate_game_participants")
        .select("id")
        .eq("game_room_id", roomId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.info("You're already in this game!");
        return;
      }

      // Join the room
      await supabase
        .from("chatmate_game_participants")
        .insert({
          game_room_id: roomId,
          user_id: user.id
        });

      // Update player count
      const room = gameRooms.find(r => r.id === roomId);
      if (room) {
        await supabase
          .from("chatmate_game_rooms")
          .update({ current_players: room.current_players + 1 })
          .eq("id", roomId);
      }

      toast.success("Joined game room!");
    } catch (error) {
      console.error("Error joining game:", error);
      toast.error("Failed to join game");
    }
  };

  const getGameType = (type: string) => GAME_TYPES.find(g => g.id === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            Game Matching
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect through fun games and challenges
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Game Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Room Title</Label>
                <Input
                  placeholder="e.g., Trivia Night!"
                  value={newGame.title}
                  onChange={(e) => setNewGame(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Game Type</Label>
                <Select
                  value={newGame.game_type}
                  onValueChange={(value) => setNewGame(prev => ({ ...prev, game_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Select
                  value={newGame.max_players.toString()}
                  onValueChange={(value) => setNewGame(prev => ({ ...prev, max_players: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} players
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={createGameRoom} 
                disabled={creating || !newGame.title.trim()}
                className="w-full"
              >
                {creating ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Game Types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GAME_TYPES.map((type) => {
          const Icon = type.icon;
          const count = gameRooms.filter(r => r.game_type === type.id).length;
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer hover:shadow-lg transition-all overflow-hidden`}
            >
              <CardContent className={`p-4 bg-gradient-to-br ${type.color} text-white`}>
                <Icon className="w-8 h-8 mb-2" />
                <h3 className="font-semibold text-sm">{type.label}</h3>
                <p className="text-xs opacity-90">{count} active rooms</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Game Rooms */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Play className="w-5 h-5" />
          Active Rooms
        </h3>

        {gameRooms.length === 0 ? (
          <Card className="p-8 text-center">
            <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold">No active game rooms</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to create one!
            </p>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="grid gap-3">
              {gameRooms.map((room, index) => {
                const gameType = getGameType(room.game_type);
                const Icon = gameType?.icon || Gamepad2;
                const isFull = room.current_players >= room.max_players;

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gameType?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{room.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {room.current_players}/{room.max_players}
                              </span>
                              <Badge 
                                variant={room.status === "waiting" ? "secondary" : "default"}
                                className="text-xs"
                              >
                                {room.status === "waiting" ? "Waiting" : "In Progress"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={room.host_profile?.avatar_url || ""} />
                              <AvatarFallback className="text-xs">
                                {(room.host_profile?.full_name || "H")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <Button
                              size="sm"
                              disabled={isFull || room.host_id === user?.id}
                              onClick={() => joinGameRoom(room.id)}
                              className={isFull ? "" : "bg-gradient-to-r from-rose-500 to-purple-600"}
                            >
                              {room.host_id === user?.id ? "Host" : isFull ? "Full" : "Join"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* How it Works */}
      <Card className="bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/20 dark:to-purple-950/20 border-rose-200/50 dark:border-rose-800/30">
        <CardContent className="p-4">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            How Game Matching Works
          </h4>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-muted-foreground">Join or create a game room with your preferred game type</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-muted-foreground">Play together and compete in fun challenges</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-muted-foreground">Connect with players you enjoyed playing with</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}