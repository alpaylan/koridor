
export type Position = {
    x: number;
    y: number;
};

export const pos = (x: number, y: number) => {
    return { x, y } as Position;
}

export const eq = (p1: Position, p2: Position) => {
    return p1.x === p2.x && p1.y === p2.y;
}
