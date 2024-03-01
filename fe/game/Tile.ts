
import { Position, pos, eq as posEq } from "./Position";
import { Game } from "./Game";

export type Tile = {
    pos: Position;
    orientation: "vertical" | "horizontal";
};

export const tile = (x: number, y: number, orientation: "vertical" | "horizontal") => {
    return { pos: pos(x, y), orientation } as Tile;
}

export const eq = (t1: Tile, t2: Tile) => {
    return posEq(t1.pos, t2.pos) && t1.orientation === t2.orientation;
}

export const isPut = (game: Game, t1: Tile) => {
    return game.putTiles.some(pt => eq(pt.t1, t1) || eq(pt.t2, t1));
}

export const isCandidate = (game: Game, t1: Tile) => {
    return game.candidateTile && eq(game.candidateTile, t1);
}

export const isNeighbor = (game: Game, t1: Tile) => {
    return game.neighborTiles.some(t => eq(t, t1));
}


export const neighbors = (game: Game, t: Tile) => {
    const { pos, orientation } = t;
    const { x, y } = pos;

    const [d1, d2] = orientation === "vertical" ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];

    let t1 = tile(x + d1[0], y + d1[1], orientation);
    let t2 = tile(x + d2[0], y + d2[1], orientation);

    let ntiles = [t1, t2];
    // Filter out the ones that are out of the board
    ntiles = ntiles.filter(t => t.pos.x >= 0 && t.pos.x <= 8 && t.pos.y >= 0 && t.pos.y <= 8);
    // Filter out the ones that are already put
    ntiles = ntiles.filter(t => !(game.putTiles.some(pt => hasTile(pt, t))));
    // Filter out the ones that cannot pass putTiles
    if (orientation === "vertical") {
        ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "horizontal" && pt.t1.pos.x === t.pos.x && pt.t1.pos.y === t.pos.y - 1));
        ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "horizontal" && pt.t1.pos.x === t.pos.x && pt.t1.pos.y === t.pos.y - 2));
    } else {
        ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "vertical" && pt.t1.pos.x === t.pos.x - 1 && pt.t1.pos.y === t.pos.y));
        ntiles = ntiles.filter(t => !game.putTiles.some(pt => pt.t1.orientation === "vertical" && pt.t1.pos.x === t.pos.x - 2 && pt.t1.pos.y === t.pos.y));
    }

    return ntiles;
}

export const hasNeighbor = (game: Game, t1: Tile) => {
    return neighbors(game, t1).length > 0;
}




export type PutTile = {
    t1: Tile;
    t2: Tile;
}

export const sortTile = (t1: Tile, t2: Tile) => {

    if (t1.orientation !== t2.orientation) {
        throw new Error("Tiles must be parallel to be sorted");
    }

    if (t1.orientation === "vertical" && t1.pos.y > t2.pos.y) {
        return [t2, t1];
    }

    if (t1.orientation === "horizontal" && t1.pos.x > t2.pos.x) {
        return [t2, t1];
    }

    return [t1, t2];

}

export const putTile = (t1: Tile, t2: Tile) => {
    if (t1.orientation !== t2.orientation) {
        throw new Error("Tiles must be parallel to be put together");
    }

    if (t1.orientation === "vertical" && t1.pos.x !== t2.pos.x) {
        throw new Error("Vertical tiles must have the same x");
    }

    if (t1.orientation === "horizontal" && t1.pos.y !== t2.pos.y) {
        throw new Error("Horizontal tiles must have the same y");
    }

    const [t1s, t2s] = sortTile(t1, t2);

    if (t1s.orientation === "vertical" && t1s.pos.y !== t2s.pos.y - 1) {
        throw new Error("Vertical tiles must be adjacent");
    }

    if (t1s.orientation === "horizontal" && t1s.pos.x !== t2s.pos.x - 1) {
        throw new Error("Horizontal tiles must be adjacent");
    }

    return { t1: t1s, t2: t2s } as PutTile;
}

export const hasTile = (pt: PutTile, t: Tile) => {
    return eq(pt.t1, t) || eq(pt.t2, t);
}

export const putTileEq = (pt1: PutTile, pt2: PutTile) => {
    return eq(pt1.t1, pt2.t1) && eq(pt1.t2, pt2.t2);
}
