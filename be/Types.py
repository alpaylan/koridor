
from dataclasses import dataclass
from abc import ABC, abstractmethod
import json

@dataclass
class User:
    id: int
    name: str

@dataclass
class Game:
    id: int
    white: User
    black: User

@dataclass
class Move(ABC):
    pass

@dataclass
class Pawn:
    x: int
    y: int

@dataclass
class MovePawn(Move):
    game: Game
    user: User
    move: Pawn

@dataclass
class Tile:
    x: int
    y: int
    orientation: str

@dataclass
class PutTile(Move):
    game: Game
    user: User
    move: Tile

