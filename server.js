var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var players = {};
var star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};
var scores = {
    blue: 0,
    red: 0
};
var bullets = {};
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
function numOfTeam(players,team){
    var count=0;
    Object.keys(players).forEach(function(key){
        if(players[key].team===team){
            count++;
        }
    });
    return count;
};
io.on('connection', function (socket) {
    if(numOfTeam(players,'red')===numOfTeam(players,'blue')){
        var teamChoice=Math.random()<0.5 ? 'red' : 'blue';
    } else {
        var teamChoice=numOfTeam(players,'red')<numOfTeam(players,'blue') ? 'red' : 'blue';
    }
    // create a new player and add it to our players object
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: teamChoice,
    };
    bullets[socket.id] = {
    }
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // send the star object to the new player
    socket.emit('starLocation', star);
    // send the current scores
    socket.emit('scoreUpdate', scores);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
        // remove this player from our players object
        delete players[socket.id];
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
        Object.keys(bullets[socket.id]).forEach(function(key){
            socket.broadcast.emit('bulletDestroyed', {bulletId:key, playerId: socket.id,})
        });
    });

    // when a player moves, update the player data
    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        // emit a message to all players about the player that moved
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
    socket.on('starCollected', function () {
        if (players[socket.id].team === 'red') {
            scores.red += 10;
        } else {
            scores.blue += 10;
        }
        star.x = Math.floor(Math.random() * 900) + 50;
        star.y = Math.floor(Math.random() * 900) + 50;
        io.emit('starLocation', star);
        io.emit('scoreUpdate', scores);
    });
    socket.on('bulletMovement', function(bulletData){
        socket.broadcast.emit('bulletMoved', bulletData)
    });
    socket.on('bulletCreated', function(bulletData){
        socket.broadcast.emit('bulletCreate', bulletData)
        bullets[bulletData.playerId][bulletData.bulletId]=bulletData.bulletId
    });
    socket.on('bulletDestroyed', function(bulletData){
        socket.broadcast.emit('bulletDestroyed', bulletData)
        delete bullets[bulletData.playerId][bulletData.bulletId]
    });
    socket.on('playerHit', function(playerId){
        io.emit('playerHit', {playerId: playerId, players:players})
    });
});

server.listen(2733, function () {
});