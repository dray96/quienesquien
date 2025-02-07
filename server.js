const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Manejar todas las rutas para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Almacenar las partidas activas
const activeGames = new Map();

// Manejar conexiones WebSocket
wss.on('connection', (ws) => {
    console.log('Nueva conexión establecida');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnection(ws);
    });
});

// Función para manejar los mensajes
function handleMessage(ws, data) {
    console.log('Mensaje recibido:', data);
    
    switch (data.type) {
        case 'create':
            createGame(ws, data);
            break;
        case 'join':
            joinGame(ws, data);
            break;
        case 'selectCharacter':
            handleCharacterSelection(ws, data);
            break;
        case 'question':
            handleQuestion(ws, data);
            break;
        case 'answer':
            handleAnswer(ws, data);
            break;
        case 'guess':
            handleGuess(ws, data);
            break;
        default:
            console.log('Tipo de mensaje no reconocido:', data.type);
    }
}

// Funciones de manejo del juego
function createGame(ws, data) {
    const gameId = generateGameId();
    console.log('Creando partida:', gameId);
    
    const game = {
        id: gameId,
        players: [{
            ws,
            nick: data.nick
        }],
        status: 'waiting'
    };
    
    activeGames.set(gameId, game);
    
    ws.send(JSON.stringify({
        type: 'gameCreated',
        gameId,
        message: 'Partida creada exitosamente'
    }));
}

function joinGame(ws, data) {
    console.log('Intentando unirse a partida:', data.gameId);
    
    const game = activeGames.get(data.gameId);
    if (!game) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Partida no encontrada'
        }));
        return;
    }

    if (game.players.length >= 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Partida llena'
        }));
        return;
    }

    game.players.push({
        ws,
        nick: data.nick
    });
    
    game.status = 'selecting';

    // Notificar a ambos jugadores que pueden empezar a seleccionar personajes
    game.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'gameStarted',
            players: game.players.map(p => p.nick)
        }));
    });
}

function handleCharacterSelection(ws, data) {
    console.log('Selección de personaje recibida:', data);
    const game = activeGames.get(data.gameId);
    if (!game) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Partida no encontrada'
        }));
        return;
    }

    // Verificar que haya dos jugadores antes de permitir la selección
    if (game.players.length < 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Esperando a que se una el segundo jugador'
        }));
        return;
    }

    const player = game.players.find(p => p.ws === ws);
    if (!player) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Jugador no encontrado'
        }));
        return;
    }

    // Guardar el personaje seleccionado
    player.character = data.characterId;
    console.log(`Jugador ${player.nick} ha seleccionado el personaje ${data.characterId}`);
    
    // Notificar al jugador que su selección fue exitosa
    ws.send(JSON.stringify({
        type: 'characterSelected',
        success: true,
        message: 'Has seleccionado tu personaje'
    }));

    // Verificar si ambos jugadores han seleccionado personaje
    const otherPlayer = game.players.find(p => p !== player);
    if (otherPlayer && otherPlayer.character) {
        // Si ambos jugadores han seleccionado, iniciar el juego
        console.log('Ambos jugadores han seleccionado personajes. Iniciando el juego.');
        startGame(game);
    } else if (otherPlayer) {
        // Solo notificar al otro jugador si ya seleccionó su personaje
        if (otherPlayer.character) {
            otherPlayer.ws.send(JSON.stringify({
                type: 'waitingOpponent',
                message: 'Esperando a que el oponente seleccione su personaje'
            }));
        }
    }
}

function startGame(game) {
    game.status = 'playing';
    game.currentTurn = game.players[0].nick;

    // Notificar a ambos jugadores que el juego ha comenzado
    game.players.forEach((player, index) => {
        const opponent = game.players[index === 0 ? 1 : 0];
        player.ws.send(JSON.stringify({
            type: 'gameReady',
            currentTurn: game.currentTurn,
            yourTurn: player.nick === game.currentTurn,
            opponent: {
                nick: opponent.nick,
                character: opponent.character
            }
        }));
    });
}

function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function handleDisconnection(ws) {
    console.log('Cliente desconectado');
    
    // Buscar la partida donde el jugador estaba participando
    for (const [gameId, game] of activeGames.entries()) {
        const playerIndex = game.players.findIndex(p => p.ws === ws);
        
        if (playerIndex !== -1 && game.status === 'playing') {
            // Encontramos al jugador en una partida activa
            const otherPlayer = game.players[playerIndex === 0 ? 1 : 0];
            
            // Notificar al jugador restante que ganó por desconexión
            if (otherPlayer && otherPlayer.ws.readyState === WebSocket.OPEN) {
                otherPlayer.ws.send(JSON.stringify({
                    type: 'opponentDisconnected',
                    message: 'Tu oponente abandonó, Ganaste por default'
                }));
            }
            
            // Marcar la partida como terminada
            game.status = 'finished';
            break;
        }
    }
}

// Añadir estas nuevas funciones para manejar preguntas y respuestas
function handleQuestion(ws, data) {
    const game = activeGames.get(data.gameId);
    if (!game || game.status !== 'playing') {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'No se puede enviar la pregunta en este momento'
        }));
        return;
    }

    const player = game.players.find(p => p.ws === ws);
    if (!player || player.nick !== game.currentTurn) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'No es tu turno'
        }));
        return;
    }

    // Encontrar al oponente
    const opponent = game.players.find(p => p !== player);
    if (!opponent) return;

    // Guardar la pregunta actual en el estado del juego
    game.currentQuestion = data.question;
    game.waitingAnswer = true;
    game.currentTurn = opponent.nick; // Cambiar el turno al oponente cuando se hace la pregunta

    // Enviar la pregunta al oponente
    opponent.ws.send(JSON.stringify({
        type: 'receiveQuestion',
        from: player.nick,
        question: data.question
    }));

    // Notificar al jugador que su pregunta fue enviada
    ws.send(JSON.stringify({
        type: 'questionSent',
        question: data.question
    }));

    // Notificar el cambio de turno a ambos jugadores
    game.players.forEach(p => {
        p.ws.send(JSON.stringify({
            type: 'turnChange',
            currentTurn: game.currentTurn,
            yourTurn: p.nick === game.currentTurn
        }));
    });
}

function handleAnswer(ws, data) {
    const game = activeGames.get(data.gameId);
    if (!game || game.status !== 'playing') return;

    const player = game.players.find(p => p.ws === ws);
    if (!player) return;

    const opponent = game.players.find(p => p !== player);
    if (!opponent) return;

    // Verificar que estamos esperando una respuesta y que es el turno del jugador que responde
    if (!game.waitingAnswer || game.currentTurn !== player.nick) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'No es momento de responder'
        }));
        return;
    }

    // Enviar la respuesta a ambos jugadores
    game.players.forEach(p => {
        p.ws.send(JSON.stringify({
            type: 'receiveAnswer',
            from: player.nick,
            answer: data.answer,
            question: game.currentQuestion
        }));
    });

    // Limpiar la pregunta actual y el estado de espera
    game.currentQuestion = null;
    game.waitingAnswer = false;

    // Ya no cambiamos el turno aquí, el jugador que respondió mantiene su turno para hacer su pregunta
}

// Añadir la función handleGuess
function handleGuess(ws, data) {
    const game = activeGames.get(data.gameId);
    if (!game || game.status !== 'playing') {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'No se puede realizar la adivinanza en este momento'
        }));
        return;
    }

    const player = game.players.find(p => p.ws === ws);
    const opponent = game.players.find(p => p !== player);
    
    if (!player || !opponent) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Error al procesar la adivinanza'
        }));
        return;
    }

    const isCorrect = data.characterId == opponent.character;
    
    // Notificar el resultado a ambos jugadores
    game.players.forEach(p => {
        p.ws.send(JSON.stringify({
            type: 'guessResult',
            correct: isCorrect,
            guesser: player.nick,
            characterId: data.characterId
        }));
    });

    // Terminar el juego
    game.status = 'finished';
}

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
}); 