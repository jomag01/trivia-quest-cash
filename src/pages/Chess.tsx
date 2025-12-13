import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Crown, Users, Plus, RefreshCw, Trophy, Clock, Loader2, Swords, Flag, RotateCcw } from 'lucide-react';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

interface Square {
  piece: Piece | null;
  row: number;
  col: number;
}

interface GameState {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  gameOver: boolean;
  winner: PieceColor | null;
  inCheck: PieceColor | null;
  moveHistory: string[];
}

interface ChessRoom {
  id: string;
  name: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  game_state: any;
  winner_id: string | null;
  created_at: string;
}

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

const initialBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces (top)
  board[0] = [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' },
  ];
  board[1] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'black' as PieceColor }));
  
  // White pieces (bottom)
  board[6] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'white' as PieceColor }));
  board[7] = [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' },
  ];
  
  return board;
};

const Chess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChessRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChessRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    board: initialBoard(),
    currentTurn: 'white',
    selectedSquare: null,
    validMoves: [],
    gameOver: false,
    winner: null,
    inCheck: null,
    moveHistory: []
  });
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);

  useEffect(() => {
    if (!user) {
      toast.error("Please create an account to play");
      navigate("/auth");
      return;
    }
    fetchRooms();
  }, [user, navigate]);

  useEffect(() => {
    if (!currentRoom) return;

    const channel = supabase
      .channel(`chess-room-${currentRoom.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chess_rooms',
        filter: `id=eq.${currentRoom.id}`
      }, (payload) => {
        const updatedRoom = payload.new as ChessRoom;
        setCurrentRoom(updatedRoom);
        if (updatedRoom.game_state) {
          setGameState(updatedRoom.game_state);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chess_rooms' as any)
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms((data || []) as unknown as ChessRoom[]);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setCreating(true);
    try {
      const newGameState: GameState = {
        board: initialBoard(),
        currentTurn: 'white',
        selectedSquare: null,
        validMoves: [],
        gameOver: false,
        winner: null,
        inCheck: null,
        moveHistory: []
      };

      const { data, error } = await supabase
        .from('chess_rooms' as any)
        .insert({
          name: roomName,
          host_id: user!.id,
          status: 'waiting',
          game_state: newGameState
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRoom(data as unknown as ChessRoom);
      setPlayerColor('white');
      setGameState(newGameState);
      setShowCreateDialog(false);
      setRoomName('');
      toast.success('Room created! Waiting for opponent...');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (room: ChessRoom) => {
    if (room.host_id === user?.id) {
      setCurrentRoom(room);
      setPlayerColor('white');
      if (room.game_state) setGameState(room.game_state);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chess_rooms' as any)
        .update({
          guest_id: user!.id,
          status: 'playing'
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;

      const roomData = data as unknown as ChessRoom;
      setCurrentRoom(roomData);
      setPlayerColor('black');
      if (roomData.game_state) setGameState(roomData.game_state);
      toast.success('Joined game! You play as Black.');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const getValidMoves = (row: number, col: number, board: (Piece | null)[][]): { row: number; col: number }[] => {
    const piece = board[row][col];
    if (!piece) return [];

    const moves: { row: number; col: number }[] = [];
    const { type, color } = piece;

    const isValidSquare = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const isEmpty = (r: number, c: number) => isValidSquare(r, c) && !board[r][c];
    const isEnemy = (r: number, c: number) => isValidSquare(r, c) && board[r][c]?.color !== color && board[r][c] !== null;

    switch (type) {
      case 'pawn': {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        if (isEmpty(row + direction, col)) {
          moves.push({ row: row + direction, col });
          if (row === startRow && isEmpty(row + 2 * direction, col)) {
            moves.push({ row: row + 2 * direction, col });
          }
        }
        if (isEnemy(row + direction, col - 1)) moves.push({ row: row + direction, col: col - 1 });
        if (isEnemy(row + direction, col + 1)) moves.push({ row: row + direction, col: col + 1 });
        break;
      }
      case 'rook': {
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of directions) {
          for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isValidSquare(newRow, newCol)) break;
            if (isEmpty(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
            } else if (isEnemy(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
              break;
            } else break;
          }
        }
        break;
      }
      case 'knight': {
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of knightMoves) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (isEmpty(newRow, newCol) || isEnemy(newRow, newCol)) {
            moves.push({ row: newRow, col: newCol });
          }
        }
        break;
      }
      case 'bishop': {
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of directions) {
          for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isValidSquare(newRow, newCol)) break;
            if (isEmpty(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
            } else if (isEnemy(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
              break;
            } else break;
          }
        }
        break;
      }
      case 'queen': {
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of directions) {
          for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isValidSquare(newRow, newCol)) break;
            if (isEmpty(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
            } else if (isEnemy(newRow, newCol)) {
              moves.push({ row: newRow, col: newCol });
              break;
            } else break;
          }
        }
        break;
      }
      case 'king': {
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (isEmpty(newRow, newCol) || isEnemy(newRow, newCol)) {
            moves.push({ row: newRow, col: newCol });
          }
        }
        break;
      }
    }

    return moves;
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!currentRoom || currentRoom.status !== 'playing') return;
    if (gameState.currentTurn !== playerColor) return;
    if (gameState.gameOver) return;

    const { board, selectedSquare, validMoves } = gameState;

    if (selectedSquare) {
      const isValidMove = validMoves.some(m => m.row === row && m.col === col);
      
      if (isValidMove) {
        const newBoard = board.map(r => [...r]);
        const capturedPiece = newBoard[row][col];
        newBoard[row][col] = newBoard[selectedSquare.row][selectedSquare.col];
        newBoard[selectedSquare.row][selectedSquare.col] = null;

        // Pawn promotion
        const piece = newBoard[row][col];
        if (piece?.type === 'pawn' && (row === 0 || row === 7)) {
          newBoard[row][col] = { type: 'queen', color: piece.color };
        }

        const cols = 'abcdefgh';
        const moveNotation = `${cols[selectedSquare.col]}${8 - selectedSquare.row}${capturedPiece ? 'x' : ''}${cols[col]}${8 - row}`;

        // Check for checkmate or check
        const nextTurn = gameState.currentTurn === 'white' ? 'black' : 'white';
        let isCheck = false;
        let isCheckmate = false;

        // Find opponent's king
        let kingPos: { row: number; col: number } | null = null;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (newBoard[r][c]?.type === 'king' && newBoard[r][c]?.color === nextTurn) {
              kingPos = { row: r, col: c };
              break;
            }
          }
        }

        // Check if king is under attack
        if (kingPos) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (newBoard[r][c]?.color === gameState.currentTurn) {
                const moves = getValidMoves(r, c, newBoard);
                if (moves.some(m => m.row === kingPos!.row && m.col === kingPos!.col)) {
                  isCheck = true;
                  break;
                }
              }
            }
          }
        }

        // Check if opponent has any valid moves
        if (isCheck) {
          let hasValidMoves = false;
          outerLoop:
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (newBoard[r][c]?.color === nextTurn) {
                const moves = getValidMoves(r, c, newBoard);
                if (moves.length > 0) {
                  hasValidMoves = true;
                  break outerLoop;
                }
              }
            }
          }
          isCheckmate = !hasValidMoves;
        }

        // Check if captured piece was a king
        const isKingCaptured = capturedPiece?.type === 'king';

        const newGameState: GameState = {
          board: newBoard,
          currentTurn: nextTurn,
          selectedSquare: null,
          validMoves: [],
          gameOver: isCheckmate || isKingCaptured,
          winner: (isCheckmate || isKingCaptured) ? gameState.currentTurn : null,
          inCheck: isCheck ? nextTurn : null,
          moveHistory: [...gameState.moveHistory, moveNotation + (isCheckmate ? '#' : isCheck ? '+' : '')]
        };

        // Update database
        const updateData: any = { game_state: newGameState };
        if (newGameState.gameOver) {
          updateData.status = 'finished';
          updateData.winner_id = newGameState.winner === 'white' ? currentRoom.host_id : currentRoom.guest_id;
        }

        const { error } = await supabase
          .from('chess_rooms' as any)
          .update(updateData)
          .eq('id', currentRoom.id);

        if (error) {
          console.error('Error updating game:', error);
          toast.error('Failed to make move');
        } else {
          setGameState(newGameState);
          if (newGameState.gameOver) {
            toast.success(`${newGameState.winner === playerColor ? 'You won!' : 'You lost!'}`);
          }
        }
      } else {
        // Deselect or select new piece
        const piece = board[row][col];
        if (piece?.color === playerColor) {
          setGameState({
            ...gameState,
            selectedSquare: { row, col },
            validMoves: getValidMoves(row, col, board)
          });
        } else {
          setGameState({
            ...gameState,
            selectedSquare: null,
            validMoves: []
          });
        }
      }
    } else {
      // Select a piece
      const piece = board[row][col];
      if (piece?.color === playerColor) {
        setGameState({
          ...gameState,
          selectedSquare: { row, col },
          validMoves: getValidMoves(row, col, board)
        });
      }
    }
  };

  const resignGame = async () => {
    if (!currentRoom) return;

    const winnerId = playerColor === 'white' ? currentRoom.guest_id : currentRoom.host_id;
    
    const { error } = await supabase
      .from('chess_rooms' as any)
      .update({
        status: 'finished',
        winner_id: winnerId,
        game_state: { ...gameState, gameOver: true, winner: playerColor === 'white' ? 'black' : 'white' }
      })
      .eq('id', currentRoom.id);

    if (error) {
      toast.error('Failed to resign');
    } else {
      toast.info('You resigned from the game');
      setCurrentRoom(null);
    }
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setPlayerColor(null);
    setGameState({
      board: initialBoard(),
      currentTurn: 'white',
      selectedSquare: null,
      validMoves: [],
      gameOver: false,
      winner: null,
      inCheck: null,
      moveHistory: []
    });
    fetchRooms();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (currentRoom) {
    const isMyTurn = gameState.currentTurn === playerColor;
    const opponentJoined = currentRoom.guest_id !== null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-stone-900/20 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    {currentRoom.name}
                  </CardTitle>
                  <CardDescription>
                    You play as {playerColor === 'white' ? '♔ White' : '♚ Black'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {currentRoom.status === 'playing' && !gameState.gameOver && (
                    <Button variant="destructive" size="sm" onClick={resignGame}>
                      <Flag className="h-4 w-4 mr-1" />
                      Resign
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={leaveRoom}>
                    Leave
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!opponentJoined && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for opponent to join...
                </div>
              )}
              {gameState.gameOver && (
                <Badge variant={gameState.winner === playerColor ? "default" : "destructive"} className="mb-4">
                  {gameState.winner === playerColor ? 'You Won!' : 'You Lost!'}
                </Badge>
              )}
              {gameState.inCheck && (
                <Badge variant="destructive" className="mb-4">
                  {gameState.inCheck === playerColor ? 'You are in Check!' : 'Opponent in Check!'}
                </Badge>
              )}
              {opponentJoined && !gameState.gameOver && (
                <Badge variant={isMyTurn ? "default" : "secondary"} className="mb-4">
                  {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Chess Board */}
          <Card className="overflow-hidden">
            <CardContent className="p-2 md:p-4">
              <div className="aspect-square max-w-[500px] mx-auto">
                <div className="grid grid-cols-8 gap-0 border-2 border-stone-800 rounded overflow-hidden">
                  {(playerColor === 'black' ? [...gameState.board].reverse().map(row => [...row].reverse()) : gameState.board).map((row, rowIndex) => {
                    const actualRow = playerColor === 'black' ? 7 - rowIndex : rowIndex;
                    return row.map((piece, colIndex) => {
                      const actualCol = playerColor === 'black' ? 7 - colIndex : colIndex;
                      const isLight = (actualRow + actualCol) % 2 === 0;
                      const isSelected = gameState.selectedSquare?.row === actualRow && gameState.selectedSquare?.col === actualCol;
                      const isValidMove = gameState.validMoves.some(m => m.row === actualRow && m.col === actualCol);

                      return (
                        <button
                          key={`${actualRow}-${actualCol}`}
                          onClick={() => handleSquareClick(actualRow, actualCol)}
                          disabled={!opponentJoined || gameState.gameOver}
                          className={`aspect-square flex items-center justify-center text-2xl sm:text-3xl md:text-4xl transition-all
                            ${isLight ? 'bg-amber-200 dark:bg-amber-100' : 'bg-amber-700 dark:bg-amber-800'}
                            ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                            ${isValidMove ? 'ring-2 ring-green-500 ring-inset' : ''}
                            ${!opponentJoined || gameState.gameOver ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                          `}
                        >
                          {piece && (
                            <span className={piece.color === 'white' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-stone-900'}>
                              {PIECE_SYMBOLS[piece.color][piece.type]}
                            </span>
                          )}
                          {isValidMove && !piece && (
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                          )}
                        </button>
                      );
                    });
                  })}
                </div>
              </div>

              {/* Move History */}
              {gameState.moveHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Move History</h4>
                  <div className="flex flex-wrap gap-1 text-xs font-mono">
                    {gameState.moveHistory.map((move, i) => (
                      <span key={i} className={`px-1.5 py-0.5 rounded ${i % 2 === 0 ? 'bg-muted' : 'bg-muted/50'}`}>
                        {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}{move}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-stone-900/20 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Crown className="h-8 w-8" />
              <div>
                <div className="text-2xl">Online Chess</div>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Challenge other players to a game of chess!
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Room
              </Button>
              <Button variant="outline" onClick={fetchRooms} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Available Games
        </h2>

        {rooms.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Games</h3>
            <p className="text-muted-foreground mb-4">Create a room to start playing!</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {room.name}
                        {room.status === 'waiting' ? (
                          <Badge variant="secondary">Waiting</Badge>
                        ) : (
                          <Badge>In Progress</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(room.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => joinRoom(room)}
                      disabled={room.status === 'playing' && room.host_id !== user?.id && room.guest_id !== user?.id}
                    >
                      {room.host_id === user?.id || room.guest_id === user?.id ? 'Rejoin' : 'Join Game'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chess Room</DialogTitle>
              <DialogDescription>
                Enter a name for your room. You'll play as White.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Room name..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={createRoom} disabled={creating} className="flex-1">
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Chess;