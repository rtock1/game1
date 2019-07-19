var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 1000,
    height: 1000,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var reloaded=true;
var counter = 1
function preload() {
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
    this.load.image('bullet', 'assets/bullet.png')
    this.load.spritesheet('reload', 
        'assets/reload.png',
        { frameWidth: 100, frameHeight: 100 });
}

function create() {
    var self = this;
    this.bullets = this.physics.add.group();
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.anims.create({
        key: 'shoot',
        frames: this.anims.generateFrameNumbers('reload', { start: 1, end: 1 }),
        frameRate: 1,
        repeat: 0
    });
    this.anims.create({
        key: 'reloaded',
        frames: this.anims.generateFrameNumbers('reload', { start: 0, end: 0 }),
        frameRate: 1,
        repeat: 0
    });
    player = this.physics.add.sprite(53, 947, 'reload');
    // this.reload=game.add.sprite(0,900,'reload')
    var bulletHit = this.physics.add.collider(this.bullets, this.otherPlayers,function (bullet, ship){
        if (bullet.playerId !== ship.playerId){
            self.socket.emit('playerHit', {
                playerId: ship.playerId,
            });
            //debugger;
            self.socket.emit('bulletDestroyed', {
                bulletId: bullet.bulletId,
                playerId : bullet.playerId
            });
            bullet.destroy()
        }
    });
    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on('playerHit', function(playerData){
        Object.keys(playerData.players).forEach(function (id) {
            // debugger;
            if (playerData.players[id].playerId === playerData.playerId.playerId) {
                if (playerData.players[id].playerId === self.socket.id){
                    self.ship.destroy();
                    self.ship=null;
                } else {
                    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                        if (playerData.players[id].playerId === otherPlayer.playerId){
                            otherPlayer.destroy()
                        }
                    });
                };
            };
        });     
    });
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });
    this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
    this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

    this.socket.on('scoreUpdate', function (scores) {
        self.blueScoreText.setText('Blue: ' + scores.blue);
        self.redScoreText.setText('Red: ' + scores.red);
    });
    this.socket.on('starLocation', function (starLocation) {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        if (self.ship){
            self.physics.add.overlap(self.ship, self.star, function () {
                this.socket.emit('starCollected');
            }, null, self);
        }
    });
    this.socket.on('bulletMoved', function (bulletData){
        self.bullets.getChildren().forEach(function (otherBullet) {
            if (bulletData.bulletId === otherBullet.bulletId) {
                otherBullet.setRotation(bulletData.rotation);
                otherBullet.setPosition(bulletData.x, bulletData.y);
            }
        });
    });
    this.socket.on('bulletCreate', function (bulletData){
        addOtherBullet(self, bulletData)
    })
    this.socket.on('bulletDestroyed', function (bulletData){
        self.bullets.getChildren().forEach(function (otherBullet) {
            if (bulletData.playerId === otherBullet.playerId && bulletData.bulletId === otherBullet.bulletId) {
                otherBullet.destroy();
            };
        });
    });
}

function update() {
    var self = this;
    if (this.ship) {
        if (this.cursors.left.isDown || this.keyA.isDown) {
            this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            this.ship.setAngularVelocity(150);
        } else {
            this.ship.setAngularVelocity(0);
        }
        if (this.cursors.up.isDown || this.keyW.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation + Math.PI/2, 100, this.ship.body.acceleration);
        } else {
            this.ship.setAcceleration(0);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            if (reloaded==true){
                player.anims.play('shoot', true);
                reloaded=false
                const bullet = self.physics.add.sprite(this.ship.x+Math.cos(this.ship.rotation+(Math.PI/2))*50,
                        this.ship.y+Math.sin(this.ship.rotation+(Math.PI/2))*50, 'bullet').setOrigin(0.5, 0.5).setDisplaySize(5, 45);
                bullet.playerId=self.socket.id;
                bullet.bulletId=counter;
                counter++
                this.bullets.add(bullet);
                bullet.setAngle(this.ship.angle);
                bullet.body.setVelocity(Math.cos(this.ship.rotation+(Math.PI/2))*400,Math.sin(this.ship.rotation+(Math.PI/2))*400)
                this.physics.velocityFromRotation(this.ship.rotation+(3*Math.PI/2), 100, this.ship.body.acceleration);
                setTimeout(function(){
                    player.anims.play('reloaded', true)
                    reloaded=true
                },750);
            }
        };
        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }

        // save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
    //emit bullet movement
    self.bullets.getChildren().forEach(function (bullet) {
        if (bullet.x<0 || bullet.y<0 || bullet.x>config.width || bullet.y>config.height){
            // debugger;
            self.socket.emit('bulletDestroyed', {
                bulletId: bullet.bulletId,
                playerId : bullet.playerId
            });
            bullet.destroy()
        } else if (!bullet.oldPosition && bullet.playerId === self.socket.id){
            self.socket.emit('bulletCreated', {
                x: bullet.x, 
                y: bullet.y, 
                rotation: bullet.rotation,  
                bulletId: bullet.bulletId,
                playerId: bullet.playerId,
            });
        } else if (bullet.oldPosition && (bullet.oldPosition.x !== bullet.x || bullet.oldPosition.y !== bullet.y) && bullet.playerId === self.socket.id) {
            self.socket.emit('bulletMovement', {
                x: bullet.x,
                y: bullet.y,
                rotation: bullet.rotation,
                bulletId: bullet.bulletId,
                playerId: bullet.playerId,
                });
        }
        bullet.oldPosition = {
            x:bullet.x,
            y:bullet.y,
        }  
    });
}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        self.ship.setTint(0x0000ff);
    } else {
        self.ship.setTint(0xff0000);
    }
    self.ship.setDrag(0);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(250);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    } else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
    otherPlayer.body.immovable = true;
}
function addOtherBullet(self,bulletData){
    // debugger;
    const otherBullet = self.add.sprite(bulletData.x, bulletData.y, 'bullet').setOrigin(0.5, 0.5).setDisplaySize(5, 45);
    otherBullet.bulletId = bulletData.bulletId;
    otherBullet.playerId = bulletData.playerId;
    self.bullets.add(otherBullet);
};