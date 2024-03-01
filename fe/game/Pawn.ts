export type Pawn = {
    x: number;
    y: number;
    color: "white" | "black";
  };
  
  export const pawn = (x: number, y: number, color: "white" | "black") => {
    return { x, y, color } as Pawn;
  }
  
  export const eq = (p1: Pawn, p2: Pawn) => {
    return p1.x === p2.x && p1.y === p2.y && p1.color === p2.color;
  }