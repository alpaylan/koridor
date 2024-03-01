

import { Pawn, pawn } from "./Pawn";
import { Position } from "./Position";
import { PutTile, Tile, hasTile, neighbors, putTile, tile, eq as tileEq } from "./Tile";


export type Game = {
  whitePawn: Pawn;
  blackPawn: Pawn;
  turn: "white" | "black";
  whiteTiles: number;
  blackTiles: number;
  putTiles: PutTile[];
  candidateTile?: Tile;
  neighborTiles: Tile[];
};

export const game = () => {
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

export function moveAvailable(game: Game, p1: Position, direction: "up" | "down" | "left" | "right"): MoveAvaibility {
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
  if (game.putTiles.some(t => hasTile(t, tile1))) {
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

export const availableMoves = (game: Game) => {
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



export const movePawn = (game: Game, target: Position) => {
  console.log("movePawn", game, target);
  if (game.turn === "white") {
    return { ...game, whitePawn: { color: "white", x: target.x, y: target.y }, turn: "black" } as Game;
  } else {
    return { ...game, blackPawn: { color: "black", x: target.x, y: target.y }, turn: "white" } as Game;
  }
}

export const putTileMove = (game: Game, t1: Tile) => {
  if (!game.candidateTile) {
    return { ...game, candidateTile: t1, neighborTiles: neighbors(game, t1) };
  } else if (game.neighborTiles.some(t => tileEq(t, t1))) {
    const [blackTiles, whiteTiles] = game.turn === "white" ? [game.blackTiles, game.whiteTiles - 1] : [game.blackTiles - 1, game.whiteTiles];
    const turn = game.turn === "white" ? "black" : "white";
    return { ...game, blackTiles, whiteTiles, turn, putTiles: [...game.putTiles, putTile(game.candidateTile, t1)], candidateTile: undefined, neighborTiles: [] };
  }
}

export const currentPlayerHasTiles = (game: Game) => {
  return game.turn === "white" ? game.whiteTiles > 0 : game.blackTiles > 0;
}




