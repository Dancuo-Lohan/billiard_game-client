export class ClientSocketHandler {
    public socket?: WebSocket
    public isConnected = 0
    private pseudo?: string
    private allPlayers?: []
    private performanceTime?: number
    public allBalls?: []
    
    setup() {
        this.socket = new WebSocket('ws://localhost:8080'); // METTRE IP SI CA NE FONCTIONNE PAS
        this.socketIsEtablished();
    }

    
    socketIsEtablished() {
        let client = this;
        this.socket.onmessage = function(event) {
            let data = JSON.parse(event.data);
            switch (data.type) {
                case 'update_players':
                    client.updatePlayersList(data.players);
                    break;
                case 'game_invitation':
                    client.showGameInvitation(data.playerID);
                break;
                case 'start_solo_game':
                    client.startSoloGame();
                    break;
                case 'object_move':
                    client.objectMove(data.objectUUID, data.position, data.quaternion);
                    break;
                case 'player_leave':
                    console.log(data.playerPseudo + "Vient de se déconnecter")
                    break;
                case 'pong':
                    const latency = performance.now() - client.performanceTime;
                    document.querySelector("#latency").textContent = latency.toFixed(2);
                    break;
                default:
                    console.error('Message non reconnu reçu du serveur : ', data);
                    break;
            }
        }

        setInterval(function() {
            client.performanceTime = performance.now();
            client.socket.send(JSON.stringify({type: 'ping'}));
        }, 1500);

        this.socket.onclose = function() {
            console.error('Connexion fermée');
            setInterval(function() {
                location.reload();
            }, 5000)
        }        
    }

    getPlayerPseudo() {
        let pseudo!: string;
        while (pseudo == "" || pseudo == null) {
            pseudo = window.prompt("Choose your nickname :")
        }
        this.pseudo = pseudo;
        this.login();

        document.querySelector("#pseudo").textContent = pseudo;
        return true;
    }


    login() {
        this.socket.send(JSON.stringify({type: 'login', playerPseudo: this.pseudo}));
    }
      
    inviteInCurrentGame(playerInvitedPseudo: string) {
        this.socket.send(JSON.stringify({type: 'invite_in_current_game', playerInvitedPseudo: playerInvitedPseudo, playerPseudo: this.pseudo}));
    }
      
    acceptGameInvitation(playerHostPseudo: string) {
        this.socket.send(JSON.stringify({type: 'accept_game_invitation', playerHostPseudo: playerHostPseudo, playerPseudo: this.pseudo}));
    }
      
    updateObjectPosition(objectUUID: number, position: [], quaternion: []) {
        this.socket.send(JSON.stringify({type: 'update_object_position', objectUUID: objectUUID, position: position, quaternion: quaternion}));
    }

    objectMove(objectUUID: number, position: [], quaternion: []) {
        this.allBalls[objectUUID].position = position
        this.allBalls[objectUUID].quaternion = quaternion
    }

    getBallPosition(objectUUID: number) {
        if (typeof(this.allBalls[objectUUID]) != 'undefined') {
            return this.allBalls[objectUUID].position
        } else {
            return false
        }
    }
    getBallQuaternion(objectUUID: number) {
        if (typeof(this.allBalls[objectUUID]) != 'undefined') {
            return this.allBalls[objectUUID].quaternion
        } else {
            return false
        }
    }
      
    playerLeftgame(playerPseudo: string) {
        console.log(`Le joueur ${playerPseudo} s'est déconnecté)`);
    }
      
    leaveGame() {
        this.socket.send(JSON.stringify({type: 'leave_game'}));
    }
      
    updatePlayersList(players: Array) {
        console.log('Liste des joueurs : ', players);
    }
      
    showGameInvitation(playerPseudo: string) {
        console.log(`Joueur ${playerPseudo} vous invite à jouer`);
        document.querySelector("#invitation").style.display = "block";
        document.querySelector("#hote").textContent = playerPseudo;
    }
      
    startSoloGame() {
        console.log(`Vous êtes dans une partie solo`);
    }
}


// const clientPlayer = new ClientSocketHandler();
// clientPlayer.setup();
// window.setTimeout(() => {
//     clientPlayer.getPlayerPseudo();    
// }, 100);