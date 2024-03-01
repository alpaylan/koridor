
from Types import *
from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from random import choices, random
import string
from flask_socketio import join_room, leave_room, SocketIO, send, emit, rooms


client = MongoClient('localhost', 27017)
db = client.koridor
games = db.games
users = db.users


app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins=['http://127.0.0.1:5000'])


@socketio.on('create')
def create_game(data):
    if 'username' not in data:
        emit('error', {'message': 'Invalid data'})
        return

    game = {
        'gameid': ''.join(choices(string.ascii_uppercase + string.digits, k=6)),
        'p1': data['username'],
        'p2': None,
        'winner': None
    }
    games.insert_one(game)
    room = game['gameid']
    join_room(room)
    emit('room', {'roomId': room}, to=room)

@socketio.on('join')
def on_join(data):
    print(data)
    if 'username' not in data or 'room' not in data:
        emit('error', {'message': 'Invalid data'})
        return

    username = data['username']
    room = data['room']

    game = games.find_one({'gameid': room})
    print(game)
    if (game is None):
        emit('error', {'message': 'Room not found'})
        return
    
    print(game)

    if (game['p2'] is not None):
        emit('error', {'message': 'Room is full'})
        return
    
    games.update_one({'gameid': room}, {'$set': {'p2': username}})

    join_room(room)
    print(username + ' has entered the room.')
    emit('start', {'opponent': username}, to=room)

@socketio.on('finish')
def on_leave(data):
    if 'username' not in data or 'room' not in data or 'winner' not in data:
        emit('error', {'message': 'Invalid data'})
        return

    username = data['username']
    room = data['room']
    winner = data['winner']

    games.update_one({'gameid': room}, {'$set': {'winner': winner}})
    leave_room(room)
    
    print(username + ' has left the room.')
    send(username + ' has left the room.', to=room)

@socketio.on('move')
def on_move(data):
    print(data)
    if 'room' not in data or 'move' not in data or 'username' not in data or 'counter' not in data:
        emit('error', {'message': 'Invalid data'})
        return
    
    room = data['room']
    move = data['move']
    username = data['username']
    if room not in rooms():
        emit('error', {'message': 'Room not found'})
        return
    
    game = games.find_one({'gameid': room})

    if (game['winner'] is not None):
        emit('error', {'message': 'Game is finished'})
        return
    
    if game['p1'] is None or game['p2'] is None:
        emit('error', {'message': 'Room is not full'})
        return

    if game['p1'] != username and game['p2'] != username:
        emit('error', {'message': 'Invalid user'})
        return

    match move['type']:
        case 'move':
            print(f'{data["username"]} has moved to {move["position"]}')
            emit('move', {**move['position'], "counter": data['counter']} , to=room, include_self=False)

        case 'putTile':
            print(f'{data["username"]} has put a tile to {move["position"]}')
            emit('putTile', {**move['position'], "counter": data['counter']}, to=room, include_self=False)
        
        case _:
            print('Invalid move type')
            emit('error', {'message': 'Invalid move type'})

if __name__ == '__main__':
    socketio.run(app)
