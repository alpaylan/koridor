import React, { createContext, useContext, useReducer } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { io } from "socket.io-client";
import { ButtonGroup } from '@rneui/themed';

import { Game, game, movePawn, putTileMove, availableMoves, currentPlayerHasTiles } from './game/Game';
import { Position } from './game/Position';
import * as Tile from './game/Tile';

// "undefined" means the URL will be computed from the `window.location` object
const URL: string = 'http://127.0.0.1:5000';

const socket = io(URL);

type State = {
  game: Game;
  roomId: string;
  username: string;
  side: "white" | "black";
  moveCounter: number;
};

const initialState: State = {
  game: game(),
  roomId: "",
  username: "",
  side: "white",
  moveCounter: 0,
};

const gameContext = createContext<{
  state: State;
  dispatch: React.Dispatch<any>;
}>({
  state: initialState,
  dispatch: () => null,
});

const gameReducer = (state: State, action: any) => {
  const game = state.game;
  switch (action.type) {
    case "move":
      socket.emit('move', {
        username: state.username,
        room: state.roomId,
        move: {
          type: "move",
          position: action.target
        },
        counter: state.moveCounter + 1
      });
      console.log("Move", action.target);
      return { ...state, game: movePawn(game, action.target), moveCounter: state.moveCounter + 1};
    case "opposition-move":
      console.log("Opposition Move", action.target);
      if (action.target.counter !== state.moveCounter + 1) {
        console.log("Counter mismatch", action.target.counter, state.moveCounter);
        return state;
      }
      return { ...state, game: movePawn(game, action.target), moveCounter: state.moveCounter + 1};
    case "putTile":
      return { ...state, game: putTileMove(game, action.target) };
    case "setMetadata":
      const side = "side" in action ? action.side : state.side;
      const username = "username" in action ? action.username : state.username;
      const roomId = "roomId" in action ? action.roomId : state.roomId;

      return { ...state, roomId: roomId, username: username, side: side };
    case "restart":
      return initialState;
    default:
      return state;
  }
}

const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <gameContext.Provider value={{ state, dispatch }}>
      {children}
    </gameContext.Provider>
  );
}

const useGame = () => {
  const context = useContext(gameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}




type SquareProps = {
  row: number;
  column: number;
  available: Position[];
};


const SquareView = React.memo(
  ({ row, column, available }: SquareProps) => {
    const { state, dispatch } = useGame();
    const game = state.game;
    const pawn = (game.whitePawn.x === column && game.whitePawn.y === row) ? game.whitePawn
      : (game.blackPawn.x === column && game.blackPawn.y === row) ? game.blackPawn
        : undefined;

    const isAvailable = !game.candidateTile && available.some(p => p.x === column && p.y === row);
    return (
      <View
        onTouchStart={() => {
          console.log("Touch square", column, row);
          if (isAvailable) {
            dispatch({ type: "move", target: { x: column, y: row } });
          }
        }}
        style={{
          width: 25,
          height: 25,
          backgroundColor: isAvailable ? "#F4A261" : "#62B1A8",
          padding: 2,
          margin: 2,
          borderRadius: 6,
        }}
      >
        {
          pawn &&
          <View
            style={{
              width: 15,
              height: 15,
              backgroundColor: pawn.color === "white" ? "#F6F5F5" : "#1B3C73",
              padding: 2,
              margin: 2.5,
              borderRadius: 10,
            }}
          ></View>
        }
      </View>
    );
  }
);

type TileProps = {
  orientation: "vertical" | "horizontal";
  row: number;
  column: number;
};

const TileView = React.memo(
  ({ row, column, orientation }: TileProps) => {
    let [width, height] = orientation === "vertical" ? [5, 25] : [25, 5];
    const { state, dispatch } = useGame();
    const game = state.game;
    const thisTile = Tile.tile(column, row, orientation);
    const isPut = Tile.isPut(game, thisTile)
    const isCandidate = Tile.isCandidate(game, thisTile);
    const isNeighbor = Tile.isNeighbor(game, thisTile);
    const hasNeighbor = Tile.hasNeighbor(game, thisTile);
    const hasTiles = currentPlayerHasTiles(game);
    const shouldShow = game.candidateTile ? isPut || isCandidate || isNeighbor : hasTiles && hasNeighbor;
    const color = isPut ? "#F40061"
      : isCandidate ? "#F40061"
        : "#FFFFFF";
    return (
      <View
        onTouchEndCapture={() => {
          if (!shouldShow) {
            return;
          }
          console.log("Touch tile", column, row, orientation);
          console.log("Candidate", game.candidateTile);
          console.log("Neighbors", game.neighborTiles);
          console.log("PutTiles", game.putTiles);
          dispatch({ type: "putTile", target: { x: column, y: row, orientation } });
        }}
        style={{
          width,
          height,
          backgroundColor: color,
          margin: 1,
          marginTop: 2,
          borderRadius: 6,
          borderColor: '#F4A261',
          borderWidth: shouldShow ? 1 : 0,
        }}
      >
      </View>
    );
  }
);



const SideTile = React.memo(
  ({ empty }: { empty: boolean }) => {
    let [width, height] = [5, 25];
    const color = !empty ? "#F4A261" : "#FFFFFF";
    return (
      <View
        style={{
          width,
          height,
          backgroundColor: color,
          margin: 1,
          marginTop: 2,
          borderRadius: 6,
          borderColor: '#F4A261',
          borderWidth: 1,
        }}
      >
      </View>
    );
  }
);

type RowProps = {
  row: number;
  available: Position[];
};

const RowView = React.memo(
  ({ row, available }: RowProps) => {
    return (
      <View
        style={{
          flexDirection: "row",
        }}>
        {
          Array(9).fill(null).map((_, i) => (
            <>
              <SquareView row={row} column={i} available={available} key={i} />
              {
                i < 8 && <TileView row={row} column={i} orientation="vertical" key={`tile${i}`} />
              }
            </>
          ))
        }
      </View>
    );
  }
);

type TileRowProps = {
  row: number;
};

const TileRowView = React.memo(
  ({ row }: TileRowProps) => {
    return (
      <View
        style={{
          flexDirection: "row",
          gap: 9,
        }}>
        {
          Array(9).fill(null).map((_, i) => (
            <TileView row={row} column={i} orientation="horizontal" key={`tile${i}`} />
          ))
        }
      </View>
    );
  }
);


const BoardView = React.memo(
  () => {
    const { state, dispatch } = useGame();
    const game = state.game;
    
    const available = game.turn === state.side ? availableMoves(game) : [];
    const [roomId, setRoomId] = React.useState<string | null>(null);

    React.useEffect(() => {

      socket.on('connect', () => {
        console.log('Connected to server');
      });

      socket.on('room', (data: any) => {
        console.log('Room from server', data);
        setRoomId(data.roomId);
      });

      socket.on('start', (data: any) => {
        console.log('Start from server', data);
        // setGameStarted(true);
      });

      socket.on('message', (data: any) => {
        console.log('Message from server', data);
      });

      socket.on('move', (data: any) => {
        console.log('Move from server', data);
        dispatch({ type: "opposition-move", target: data });
      });

      socket.on('putTile', (data: any) => {
        console.log('PutTile from server', data);
        dispatch({ type: "putTile", target: data });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    }, []);



    return (
      <>
        {roomId && <Text>{roomId}</Text>}
        <View style={{ flexDirection: "row" }}>
          {
            Array(game.whiteTiles).fill(null).map((_, i) => (
              <>
                <SideTile empty={false} key={`whiteTile${i}`} />
              </>
            ))
          }
          {
            Array(10 - game.whiteTiles).fill(null).map((_, i) => (
              <>
                <SideTile empty={true} key={`whiteTile${i}`} />
              </>
            ))
          }
        </View>
        <View>
          {
            Array(9).fill(null).map((_, i) => (
              <>
                <RowView available={available} row={i} key={`row${i}`} />
                {
                  i < 8 && <TileRowView row={i} key={`tileRow${i}`} />
                }
              </>
            ))
          }
        </View>
        <View style={{ flexDirection: "row" }}>
          {
            Array(game.blackTiles).fill(null).map((_, i) => (
              <>
                <SideTile empty={false} key={`whiteTile${i}`} />
              </>
            ))
          }
          {
            Array(10 - game.blackTiles).fill(null).map((_, i) => (
              <>
                <SideTile empty={true} key={`whiteTile${i}`} />
              </>
            ))
          }
        </View>
      </>
    );
  }
);



const IntroView = React.memo(() => {
  const { state, dispatch } = useGame();
  const [username, setUsername] = React.useState<string>("");
  const [joinOrHost, setJoinOrHost] = React.useState<boolean>(false);
  const [joiningRoomId, setJoiningRoomId] = React.useState<string>("");

  React.useEffect(() => {

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('room', (data: any) => {
      console.log('Room from server', data);
      dispatch({ type: "setMetadata", roomId: data.roomId });
    });

    socket.on('start', (data: any) => {
      console.log('Start from server', data);
    }
    );

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('message', (data: any) => {
      console.log('Message from server', data);
    });

    socket.on('error', (data: any) => {
      console.log('Error from server', data);
    });

  }, []);

  return (
    <View>
      <Text>Enter your name</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
        onChangeText={text => setUsername(text)}
        value={username}
      />
      <ButtonGroup buttons={["Join", "Host"]}
        selectedIndex={joinOrHost ? 0 : 1}
        onPress={(i: number) => setJoinOrHost(i === 0)} />
      {
        joinOrHost === false &&
        <View>
          <Button title="Host" onPress={() => {
            dispatch({ type: "setMetadata", username, side: "white" });
            socket.emit('create', { username: username })
          }} />
        </View>
      }
      {
        joinOrHost === true &&
        <View>
          <Text>Enter the rom id</Text>
          <TextInput
            style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
            onChangeText={text => setJoiningRoomId(text)}
            value={joiningRoomId}
          />
          <Button title="Join" onPress={() => {
            console.log("Joining", joiningRoomId);
            socket.emit('join', { username: username, room: joiningRoomId })
            dispatch({ type: "setMetadata", roomId: joiningRoomId, username, side: "black" });
          }} />
        </View>
      }
    </View>
  );
});

type GameStatus = "idle" | "waiting" | "started" | "finished";
const GameView = React.memo(() => {
  const { state, dispatch } = useGame();
  const game = state.game;
  const [gameState, setGameState] = React.useState<GameStatus>("idle");
  const gameOver = game.whitePawn.y === 8 || game.blackPawn.y === 0;

  if (gameOver && gameState !== "finished") {
    setGameState("finished");

    socket.emit('finish', {
      username: state.username,
      room: state.roomId,
      winner: game.turn === "white" ? "black" : "white"
    });
  }

  React.useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('start', (data: any) => {
      console.log('Start from server', data);
      setGameState("started");
    });
  }, []);

  React.useEffect(() => {
    if (state.roomId !== "") {
      setGameState("waiting");
    }
  }, [state.roomId]);

  return (
    <View style={styles.container}>
      {
        gameState === "idle" &&
        <IntroView />
      }
      {
        gameState === "waiting" &&
        <>
          <Text>Waiting for the other player</Text>
          <Text>Room ID: {state.roomId}</Text>
        </>
      }
      {
        gameState === "started" &&
        <BoardView />
      }
      {
        gameState === "finished" &&
        <View>
          <Text>Game Over</Text>
          <Text>{game.turn === "white" ? "Black" : "White"} wins!</Text>
          <Button title="Restart" onPress={() => {
            setGameState("idle");
            dispatch({ type: "restart" })
          }} />
        </View>
      }
      <Button 
      title="Log State"
        onPress={() => {
        console.log(state);
      }}/>
    </View>
  );
});



export default function App() {
  return (
    <View style={styles.container}>
      <GameProvider>
        <GameView />
      </GameProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
