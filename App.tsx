import React, { createContext, useContext, useReducer } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type Position = {
  x: number;
  y: number;
};

const pos = (x: number, y: number) => {
  return { x, y } as Position;
}

const posEq = (p1: Position, p2: Position) => {
  return p1.x === p2.x && p1.y === p2.y;
}

type Tile = {
  x: number;
  y: number;
  orientation: "vertical" | "horizontal";
};


const tile = (x: number, y: number, orientation: "vertical" | "horizontal") => {
  return { x, y, orientation } as Tile;
}

const tileEq = (t1: Tile, t2: Tile) => {
  return t1.x === t2.x && t1.y === t2.y && t1.orientation === t2.orientation;
}

type PutTile = {
  t1: Tile;
  t2: Tile;
}

const sortTile = (t1: Tile, t2: Tile) => {

  if (t1.orientation !== t2.orientation) {
    throw new Error("Tiles must be parallel to be sorted");
  }

  if (t1.orientation === "vertical" && t1.y > t2.y) {
    return [t2, t1];
  }

  if (t1.orientation === "horizontal" && t1.x > t2.x) {
    return [t2, t1];
  }

  return [t1, t2];

}
const putTile = (t1: Tile, t2: Tile) => {
  if (t1.orientation !== t2.orientation) {
    throw new Error("Tiles must be parallel to be put together");
  }

  if (t1.orientation === "vertical" && t1.x !== t2.x) {
    throw new Error("Vertical tiles must have the same x");
  }

  if (t1.orientation === "horizontal" && t1.y !== t2.y) {
    throw new Error("Horizontal tiles must have the same y");
  }

  const [t1s, t2s] = sortTile(t1, t2);

  if (t1s.orientation === "vertical" && t1s.y !== t2s.y - 1) {
    throw new Error("Vertical tiles must be adjacent");
  }

  if (t1s.orientation === "horizontal" && t1s.x !== t2s.x - 1) {
    throw new Error("Horizontal tiles must be adjacent");
  }

  return { t1: t1s, t2: t2s } as PutTile;
}

const putTileEq = (pt1: PutTile, pt2: PutTile) => {
  return tileEq(pt1.t1, pt2.t1) && tileEq(pt1.t2, pt2.t2);
}

const tiles = (pts: PutTile[]) => {
  return pts.map(pt => [pt.t1, pt.t2]).flat();
}

type Pawn = {
  x: number;
  y: number;
  color: "white" | "black";
};

const pawn = (x: number, y: number, color: "white" | "black") => {
  return { x, y, color } as Pawn;
}

const pawnEq = (p1: Pawn, p2: Pawn) => {
  return p1.x === p2.x && p1.y === p2.y && p1.color === p2.color;
}

type Game = {
  whitePawn: Pawn;
  blackPawn: Pawn;
  turn: "white" | "black";
  whiteTiles: number;
  blackTiles: number;
  putTiles: PutTile[];
  candidateTile?: Tile;
  neighborTiles: Tile[];
};

const game = () => {
  return {
    whitePawn: pawn(4, 0, "white"),
    blackPawn: pawn(4, 8, "black"),
    turn: "white" as "white" | "black",
    whiteTiles: 10,
    blackTiles: 10,
    putTiles: [],
    candidateTiles: undefined,
    neighborTiles: [],
  } as Game;
};

type MoveAvaibility = { tag: "unavailable" } | { tag: "available", target: Position } | { tag: "jump", target: Position[] };

function moveAvailable(game: Game, p1: Position, direction: "up" | "down" | "left" | "right"): MoveAvaibility {
  const [dx, dy] = direction === "up" ? [0, -1]
    : direction === "down" ? [0, 1]
      : direction === "left" ? [-1, 0]
        : [1, 0];

  const target = { x: p1.x + dx, y: p1.y + dy };

  // Check 1: If the target is out of the board
  if (target.x < 0 || target.x > 8 || target.y < 0 || target.y > 8) {
    return { tag: "unavailable" };
  }

  const tile1 = (direction === "left") ? tile(p1.x - 1, p1.y, "vertical")
              : (direction === "right") ? tile(p1.x, p1.y, "vertical")
              : (direction === "up") ? tile(p1.x, p1.y - 1, "horizontal")
              : tile(p1.x, p1.y, "horizontal")

  // Check 2: If there is a tile on the way
  if (tiles(game.putTiles).some(t => tileEq(t, tile1))) {
    return { tag: "unavailable" };
  }

  // Check 3: If there is a pawn on the way
  const otherPawn = game.turn === "white" ? game.blackPawn : game.whitePawn;
  if (otherPawn.x === target.x && otherPawn.y === target.y) {
    // If there is a pawn, check if you can jump on it
    let canJump = moveAvailable(game, target, direction);
    if (canJump.tag === "unavailable") {
      // If you can't jump, check the other directions
      let [t1, t2] = (direction === "up" || direction === "down")
        ? [moveAvailable(game, target, "left"), moveAvailable(game, target, "right")]
        : [moveAvailable(game, target, "down"), moveAvailable(game, target, "up")];
      if (t1.tag === "available" && t2.tag === "available") {
        return { tag: "jump", target: [t1.target, t2.target] };
      } else if (t1.tag === "available") {
        return { tag: "jump", target: [t1.target] };
      } else if (t2.tag === "available") {
        return { tag: "jump", target: [t2.target] };
      } else {
        return { tag: "unavailable" };
      }
    } else if (canJump.tag === "available") {
      return { tag: "jump", target: [canJump.target] };
    } else {
      throw new Error("Impossible, you cannot jump on a pawn and then jump again");
    }
  }

  return { tag: "available", target };
}

const availableMoves = (game: Game) => {
  const pawn = game.turn === "white" ? game.whitePawn : game.blackPawn;
  const moves = [];

  /// Check left
  let left = moveAvailable(game, pawn, "left");
  if (left.tag === "available") {
    moves.push(left.target);
  } else if (left.tag === "jump") {
    moves.push(...left.target);
  }

  /// Check right
  let right = moveAvailable(game, pawn, "right");
  if (right.tag === "available") {
    moves.push(right.target);
  } else if (right.tag === "jump") {
    moves.push(...right.target);
  }

  /// Check up
  let up = moveAvailable(game, pawn, "up");
  if (up.tag === "available") {
    moves.push(up.target);
  } else if (up.tag === "jump") {
    moves.push(...up.target);
  }

  /// Check down
  let down = moveAvailable(game, pawn, "down");
  if (down.tag === "available") {
    moves.push(down.target);
  } else if (down.tag === "jump") {
    moves.push(...down.target);
  }

  return moves;
}



const movePawn = (game: Game, target: Position) => {
  if (game.turn === "white") {
    return { ...game, whitePawn: {color: "white", x: target.x, y: target.y } , turn: "black" } as Game;
  } else {
    return { ...game, blackPawn: {color: "black", x: target.x, y: target.y }, turn: "white" } as Game;
  }
}

const neighbors = (candidateTile: Tile, game: Game) => {
  const { x, y, orientation } = candidateTile;

  const [d1, d2] = orientation === "vertical" ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];

  let t1 = { x: x + d1[0], y: y + d1[1], orientation } as Tile;
  let t2 = { x: x + d2[0], y: y + d2[1], orientation } as Tile;

  let ntiles = [t1, t2];
  // Filter out the ones that are out of the board
  ntiles = ntiles.filter(t => t.x >= 0 && t.x <= 8 && t.y >= 0 && t.y <= 8);
  // Filter out the ones that are already put
  ntiles = ntiles.filter(t => !(tiles(game.putTiles).some(pt => tileEq(pt, t))));
  // Filter out the ones that cannot pass putTiles
  if (orientation === "vertical") {
    if (game.candidateTile && tileEq(game.candidateTile, candidateTile)) {
      console.log("Vertical", ntiles);
      console.log("PutTiles", game.putTiles);
      console.log("CandidateTile", candidateTile);
    }
    ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "horizontal" && pt.t1.x === t.x && pt.t1.y === t.y - 1));
    ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "horizontal" && pt.t1.x === t.x && pt.t1.y === t.y - 2));
  } else {
    ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "vertical" && pt.t1.x === t.x - 1 && pt.t1.y === t.y));
    ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "vertical" && pt.t1.x === t.x - 2 && pt.t1.y === t.y));
  }

  return ntiles;
}

const gameContext = createContext<{
  state: Game;
  dispatch: React.Dispatch<any>;
}>({
  state: game(),
  dispatch: () => null,
});

const gameReducer = (state: Game, action: any) => {
  switch (action.type) {
    case "move":
      return movePawn(state, action.target);
    case "putTile":
      // No candidate tile, set it
      if (!state.candidateTile) {
        return { ...state, candidateTile: action.target, neighborTiles: neighbors(action.target, state) };
      } else if (state.neighborTiles.some(t => tileEq(t, action.target))) {
        const [blackTiles, whiteTiles] = state.turn === "white" ? [state.blackTiles, state.whiteTiles - 1] : [state.blackTiles - 1, state.whiteTiles];
        const turn = state.turn === "white" ? "black" : "white";
        return { ...state, blackTiles, whiteTiles, turn, putTiles: [...state.putTiles, putTile(state.candidateTile, action.target)], candidateTile: undefined, neighborTiles: [] };
      }
      return state;
    case "restart":
      return game();
    default:
      return state;
  }
}

const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, game());
  return (
    <gameContext.Provider value={{state, dispatch}}>
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


const Square = React.memo(
  ({ row, column, available }: SquareProps) => {
    const { state, dispatch } = useGame();
    
    const pawn = (state.whitePawn.x === column && state.whitePawn.y === row) ? state.whitePawn
      : (state.blackPawn.x === column && state.blackPawn.y === row) ? state.blackPawn
        : undefined;
    
    const isAvailable = !state.candidateTile && available.some(p => p.x === column && p.y === row);
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

const Tile = React.memo(
  ({ row, column, orientation }: TileProps) => {
    let [width, height] = orientation === "vertical" ? [5, 25] : [25, 5];
    const { state, dispatch } = useGame();
    const isPut = tiles(state.putTiles).some(t => t.x === column && t.y === row && t.orientation === orientation);
    const isCandidate =  state.candidateTile && tileEq(state.candidateTile, { x: column, y: row, orientation });
    const isNeighbor = state.neighborTiles.some(t => tileEq(t, { x: column, y: row, orientation }));
    const neighborTiles = neighbors({ x: column, y: row, orientation }, state);
    const hasNeighbor = neighborTiles.length > 0;
    const hasTiles = state.turn === "white" ? state.whiteTiles > 0 : state.blackTiles > 0;
    const shouldShow = state.candidateTile ? isPut || isCandidate || isNeighbor : hasTiles && hasNeighbor;
    const color = isPut ? "#F40061"
                  : isCandidate ?  "#F40061"
                  : "#FFFFFF";
    return (
      <View
        onTouchEndCapture={() => {
          if (!shouldShow) {
            return;
          }
          console.log("Touch tile", column, row, orientation);
          console.log("Candidate", state.candidateTile);
          console.log("Neighbors", state.neighborTiles);
          console.log("PutTiles", state.putTiles);
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
  ({empty}: {empty: boolean}) => {
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

const Row = React.memo(
  ({ row, available }: RowProps) => {
    return (
      <View
        style={{
          flexDirection: "row",
        }}>
        {
          Array(9).fill(null).map((_, i) => (
            <>
              <Square row={row} column={i} available={available} key={i} />
              {
                i < 8 && <Tile row={row} column={i} orientation="vertical" key={`tile${i}`} />
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

const TileRow = React.memo(
  ({row}: TileRowProps) => {
    return (
      <View
        style={{
          flexDirection: "row",
          gap: 9,
        }}>
        {
          Array(9).fill(null).map((_, i) => (
            <Tile row={row} column={i} orientation="horizontal" key={`tile${i}`} />
          ))
        }
      </View>
    );
  }
);


const Board = React.memo(
  () => {
    const { state, dispatch } = useGame();
    const available = availableMoves(state);
    const gameOver = state.whitePawn.y === 8 || state.blackPawn.y === 0;

    if (gameOver) {
      return (
        <View>
          <Text>Game Over</Text>
          <Text>{state.turn === "white" ? "Black" : "White"} wins!</Text>
          <Button title="Restart" onPress={() => dispatch({ type: "restart" })} />
        </View>
      );
    }

    return (
      <>
      <View style={{ flexDirection: "row" }}>
        {
          Array(state.whiteTiles).fill(null).map((_, i) => (
            <>
              <SideTile empty={false} key={`whiteTile${i}`} />
            </>
          ))
        }
        {
          Array(10 - state.whiteTiles).fill(null).map((_, i) => (
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
              <Row available={available} row={i} key={`row${i}`} />
              {
                i < 8 && <TileRow row={i} key={`tileRow${i}`} />
              }
            </>
          ))
        }
      </View>
      <View style={{ flexDirection: "row" }}>
        {
          Array(state.blackTiles).fill(null).map((_, i) => (
            <>
              <SideTile empty={false} key={`whiteTile${i}`} />
            </>
          ))
        }
        {
          Array(10 - state.blackTiles).fill(null).map((_, i) => (
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


export default function App() {
  return (
    <View style={styles.container}>
      <GameProvider>
        <Board key={1} />
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
