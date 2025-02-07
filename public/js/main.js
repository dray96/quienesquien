// Configuración de WebSocket
const WS_URL = window.location.protocol === 'https:' 
    ? `wss://${window.location.host}`
    : `ws://${window.location.host}`;

let ws = null;
let gameState = {
    gameId: null,
    playerNick: null,
    selectedCharacter: null,
    opponent: null,
    isMyTurn: false,
    currentTurn: null
};
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Elementos DOM
const screens = {
    start: document.getElementById('start-screen'),
    characterSelect: document.getElementById('character-select'),
    game: document.getElementById('game-screen')
};

// Declaración de variable global para el temporizador de pregunta
let questionTimer = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    connectWebSocket();
});

// Inicializar listeners de eventos
function initializeEventListeners() {
    document.getElementById('create-game').addEventListener('click', createGame);
    document.getElementById('join-game-btn').addEventListener('click', showJoinGameForm);
    document.getElementById('join-game').addEventListener('click', joinGame);
    document.getElementById('send-question').addEventListener('click', sendQuestion);
    document.getElementById('answer-yes').addEventListener('click', () => sendAnswer(true));
    document.getElementById('answer-no').addEventListener('click', () => sendAnswer(false));
    document.getElementById('guess-button').addEventListener('click', showGuessModal);
    document.getElementById('cancel-guess').addEventListener('click', hideGuessModal);
    document.getElementById('confirm-guess').addEventListener('click', submitGuess);
    document.getElementById('close-result').addEventListener('click', hideResultModal);
}

// Conectar WebSocket con manejo de reconexión
function connectWebSocket() {
    console.log('Intentando conectar al WebSocket:', WS_URL);
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('Conectado al servidor WebSocket');
            reconnectAttempts = 0;
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Mensaje recibido:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error al procesar mensaje:', error);
            }
        };
        
        ws.onclose = (event) => {
            console.log('Desconectado del servidor WebSocket:', event.code, event.reason);
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                console.log(`Reintentando conexión en ${timeout/1000} segundos...`);
                
                setTimeout(() => {
                    reconnectAttempts++;
                    connectWebSocket();
                }, timeout);
            } else {
                alert('Error de conexión con el servidor. Por favor, recarga la página.');
            }
        };

        ws.onerror = (error) => {
            console.error('Error en WebSocket:', error);
        };
    } catch (error) {
        console.error('Error al crear la conexión WebSocket:', error);
        alert('Error al conectar con el servidor. Por favor, verifica tu conexión a internet.');
    }
}

// Manejar mensajes WebSocket
function handleWebSocketMessage(data) {
    console.log('Mensaje recibido:', data);
    switch (data.type) {
        case 'gameCreated':
            handleGameCreated(data);
            break;
        case 'gameStarted':
            handleGameStarted(data);
            break;
        case 'characterSelected':
            handleCharacterSelected(data);
            break;
        case 'waitingOpponent':
            handleWaitingOpponent(data);
            break;
        case 'gameReady':
            handleGameReady(data);
            break;
        case 'receiveQuestion':
            handleReceiveQuestion(data);
            break;
        case 'questionSent':
            handleQuestionSent(data);
            break;
        case 'receiveAnswer':
            handleReceiveAnswer(data);
            break;
        case 'turnChange':
            handleTurnChange(data);
            break;
        case 'guessResult':
            handleGuessResult(data);
            break;
        case 'opponentDisconnected':
            handleOpponentDisconnected(data);
            break;
        case 'error':
            handleError(data);
            break;
    }
}

// Funciones de manejo de eventos del juego
function createGame() {
    const nickname = document.getElementById('nickname').value.trim();
    if (!nickname) {
        alert('Por favor, ingresa un nombre');
        return;
    }
    
    gameState.playerNick = nickname;
    ws.send(JSON.stringify({
        type: 'create',
        nick: nickname
    }));
}

function showJoinGameForm() {
    document.getElementById('join-game-form').classList.remove('hidden');
}

function joinGame() {
    const nickname = document.getElementById('nickname').value.trim();
    const gameCode = document.getElementById('game-code').value.trim().toUpperCase();
    
    if (!nickname || !gameCode) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    console.log('Uniéndose a la partida:', gameCode);
    gameState.playerNick = nickname;
    gameState.gameId = gameCode; // Guardar el ID de la partida
    
    ws.send(JSON.stringify({
        type: 'join',
        gameId: gameCode,
        nick: nickname
    }));
}

function handleGameCreated(data) {
    console.log('Partida creada:', data);
    gameState.gameId = data.gameId;
    
    // Mostrar el código en el modal
    const modal = document.getElementById('game-code-modal');
    const codeDisplay = document.getElementById('game-code-display');
    codeDisplay.textContent = data.gameId;
    modal.classList.remove('hidden');

    // Event listener para el botón de copiar
    document.getElementById('copy-code').addEventListener('click', () => {
        navigator.clipboard.writeText(data.gameId);
        const confirmationLabel = document.getElementById('copy-confirmation');
        confirmationLabel.classList.remove('hidden');
        
        // Ocultar el mensaje después de 2 segundos
        setTimeout(() => {
            confirmationLabel.classList.add('hidden');
        }, 2000);
    });

    // Event listener para el botón de aceptar
    document.getElementById('accept-code').addEventListener('click', () => {
        modal.classList.add('hidden');
        showScreen('characterSelect');
        loadCharacters();
    });
}

function handleGameStarted(data) {
    console.log('Juego iniciado:', data);
    showScreen('characterSelect');
    loadCharacters();
}

function handleCharacterSelected(data) {
    if (data.success) {
        console.log('Personaje seleccionado con éxito');
        // Mostrar mensaje de espera
        const grid = document.getElementById('characters-grid');
        grid.innerHTML = '<div class="waiting-message"><h2>Personaje seleccionado</h2><p>Esperando al oponente...</p></div>';
    } else {
        console.error('Error al seleccionar personaje:', data.message);
        alert('Error al seleccionar personaje: ' + data.message);
    }
}

function handleWaitingOpponent(data) {
    const grid = document.getElementById('characters-grid');
    grid.innerHTML = '<div class="waiting-message"><h2>Esperando al oponente</h2><p>' + data.message + '</p></div>';
}

function handleGameReady(data) {
    gameState.opponent = data.opponent;
    gameState.currentTurn = data.currentTurn;
    gameState.isMyTurn = data.yourTurn;
    
    document.getElementById('rival-name').textContent = data.opponent.nick;
    
    showScreen('game');
    updateGameBoard();
    updateTurnIndicator();

    const questionInput = document.getElementById('question');
    const sendButton = document.getElementById('send-question');
    const guessButton = document.getElementById('guess-button');
    const timerElement = document.getElementById('question-timer');
    
    if (gameState.isMyTurn) {
        questionInput.disabled = false;
        sendButton.disabled = false;
        guessButton.disabled = false;
        guessButton.style.opacity = '1';
        guessButton.style.cursor = 'pointer';
        startQuestionTimer();
    } else {
        questionInput.disabled = true;
        sendButton.disabled = true;
        guessButton.disabled = true;
        guessButton.style.opacity = '0.5';
        guessButton.style.cursor = 'not-allowed';
        
        // Mostrar mensaje de espera y temporizador del rival
        //let opponentTime = 25;
        timerElement.textContent = `Espera tu turno`;
        timerElement.classList.add('waiting');
        //
        //const opponentTimer = setInterval(() => {
        //    opponentTime--;
        //    if (opponentTime > 0) {
        //        timerElement.textContent = `Espera tu turno (${opponentTime}s)`;
        //    } else {
        //        clearInterval(opponentTimer);
        //    }
        //}, 1000);
    }
}

function handleQuickFilter(e) {
    const button = e.currentTarget;
    button.classList.toggle('active');

    // Obtener todos los filtros activos
    const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active')).map(btn => ({
        filter: btn.dataset.filter,
        value: btn.dataset.value
    }));

    // Obtener todos los personajes
    const characters = document.querySelectorAll('.gallery-character');
    
    characters.forEach(character => {
        if (activeFilters.length === 0) {
            // Si no hay filtros activos, mostrar todos los personajes
            character.classList.remove('discarded');
        } else {
            // Verificar si el personaje cumple con TODOS los filtros activos
            const matchesAllFilters = activeFilters.every(filterData => {
                const characterValue = character.dataset[filterData.filter];
                return characterValue === filterData.value;
            });

            if (matchesAllFilters) {
                character.classList.remove('discarded');
            } else {
                character.classList.add('discarded');
            }
        }
    });
}

function updateGameBoard() {
    const gameBoard = document.querySelector('.game-board');
    const playerInfo = document.querySelector('.player-info');
    
    // Actualizar información del jugador
    playerInfo.innerHTML = `
        <h3>Tu personaje</h3>
        <img src="${gameState.selectedCharacter.image}" alt="${gameState.selectedCharacter.name}">
        <p>${gameState.selectedCharacter.name}</p>
    `;
    
    // Mostrar el indicador de turno
    const turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    turnIndicator.className = 'turn-indicator';
    turnIndicator.textContent = gameState.isMyTurn ? 'Tu turno' : 'Turno del oponente';
    gameBoard.insertBefore(turnIndicator, gameBoard.firstChild);

    // Añadir la galería de personajes disponibles
    const charactersGallery = document.createElement('div');
    charactersGallery.className = 'characters-gallery';
    charactersGallery.innerHTML = '<h3>Personajes existentes</h3>';

    const galleryGrid = document.createElement('div');
    galleryGrid.className = 'gallery-grid';
    
    // Cargar y mostrar todos los personajes
    fetch('/characters.json')
        .then(response => response.json())
        .then(data => {
            data.characters.forEach(character => {
                const characterCard = document.createElement('div');
                characterCard.className = 'gallery-character';
                // Añadir datos para filtros
                characterCard.dataset.genero = character.attributes.genero;
                characterCard.dataset.sombrero = character.attributes.sombrero.toString();
                characterCard.dataset.barba = character.attributes.barba.toString();
                characterCard.dataset.gafas = character.attributes.gafas.toString();
                
                characterCard.innerHTML = `
                    <div class="character-image-container">
                        <img src="${character.image}" alt="${character.name}"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23666%22>${character.name[0]}</text></svg>'">
                        <button class="discard-character" title="Descartar personaje">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <p>${character.name}</p>
                `;

                // Añadir evento al botón de descarte
                const discardButton = characterCard.querySelector('.discard-character');
                discardButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    characterCard.classList.toggle('discarded');
                });
                
                galleryGrid.appendChild(characterCard);
            });
            
            charactersGallery.appendChild(galleryGrid);

            // Añadir los filtros
            const quickFilters = document.createElement('div');
            quickFilters.className = 'quick-filters';
            quickFilters.innerHTML = `
                <div class="filter-buttons">
                    <small>Filtros de Descarte Rápido:</small>
                    <div class="filter-btn-container">
                        <button class="filter-btn" data-filter="genero" data-value="hombre">
                            <i class="fas fa-male"></i>Hombres
                        </button>
                        <button class="filter-btn" data-filter="genero" data-value="mujer">
                            <i class="fas fa-female"></i>Mujeres
                        </button>
                        <button class="filter-btn" data-filter="sombrero" data-value="true">
                            <i class="fas fa-hat-cowboy"></i>Sombrero
                        </button>
                        <button class="filter-btn" data-filter="barba" data-value="true">
                            <i class="fas fa-user-tie"></i>Barba
                        </button>
                        <button class="filter-btn" data-filter="gafas" data-value="true">
                            <i class="fas fa-glasses"></i>Gafas
                        </button>
                    </div>
                </div>
            `;
            
            charactersGallery.appendChild(quickFilters);
            
            // Añadir la galería al tablero
            const gameBoard = document.querySelector('.game-board');
            gameBoard.appendChild(charactersGallery);

            // Añadir event listeners a los botones de filtro
            document.querySelectorAll('.filter-btn').forEach(button => {
                button.addEventListener('click', handleQuickFilter);
            });
        })
        .catch(error => {
            console.error('Error al cargar los personajes:', error);
            charactersGallery.innerHTML += '<p>Error al cargar los personajes</p>';
        });
}

function updateTurnIndicator() {
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
        turnIndicator.textContent = gameState.isMyTurn ? 'Es tu turno' : 'Turno del oponente';
        turnIndicator.className = 'turn-indicator ' + (gameState.isMyTurn ? 'your-turn' : 'opponent-turn');
    }
}

function handleError(data) {
    alert(data.message);
}

// Cargar y mostrar personajes
async function loadCharacters() {
    try {
        console.log('Intentando cargar personajes...');
        const response = await fetch('/characters.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos de personajes recibidos:', data);
        
        if (!data || !data.characters || !Array.isArray(data.characters)) {
            throw new Error('Formato de datos inválido');
        }
        
        if (data.characters.length === 0) {
            throw new Error('No hay personajes disponibles');
        }
        
        displayCharacters(data.characters);
    } catch (error) {
        console.error('Error detallado al cargar personajes:', error);
        // Cargar personajes de respaldo en caso de error
        const personajesRespaldo = [
            {
                id: 1,
                name: "María",
                image: "/img/maria.png",
                attributes: {
                    genero: "mujer",
                    pelo: "rubio",
                    ojos: "azules",
                    gafas: true,
                    sombrero: false,
                    barba: false
                }
            },
            {
                id: 2,
                name: "Juan",
                image: "/img/juan.png",
                attributes: {
                    genero: "hombre",
                    pelo: "negro",
                    ojos: "marrones",
                    gafas: false,
                    sombrero: true,
                    barba: true
                }
            },
            {
                id: 3,
                name: "Ana",
                image: "/img/ana.png",
                attributes: {
                    genero: "mujer",
                    pelo: "castaño",
                    ojos: "verdes",
                    gafas: true,
                    sombrero: true,
                    barba: false
                }
            }
        ];
        
        console.log('Usando personajes de respaldo');
        displayCharacters(personajesRespaldo);
    }
}

function displayCharacters(characters) {
    const grid = document.getElementById('characters-grid');
    grid.innerHTML = '<h2>Selecciona tu personaje</h2>';
    
    const charactersContainer = document.createElement('div');
    charactersContainer.className = 'characters-container';
    
    characters.forEach(character => {
        const characterCard = document.createElement('div');
        characterCard.className = 'character-card';
        characterCard.dataset.characterId = character.id;
        
        characterCard.innerHTML = `
            <div class="character-image">
                <img src="${character.image}" alt="${character.name}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23666%22>${character.name[0]}</text></svg>'">
            </div>
            <h3>${character.name}</h3>
            <div class="character-info">
                <p><strong>Género:</strong> ${character.attributes.genero}</p>
                <p><strong>Pelo:</strong> ${character.attributes.pelo}</p>
                <p><strong>Ojos:</strong> ${character.attributes.ojos}</p>
                <p><strong>Gafas:</strong> ${character.attributes.gafas ? 'Sí' : 'No'}</p>
                <p><strong>Sombrero:</strong> ${character.attributes.sombrero ? 'Sí' : 'No'}</p>
                <p><strong>Barba:</strong> ${character.attributes.barba ? 'Sí' : 'No'}</p>
            </div>
            <button class="select-character-btn">Seleccionar Personaje</button>
        `;

        // Agregar el evento click al botón después de crear el elemento
        const selectButton = characterCard.querySelector('.select-character-btn');
        selectButton.addEventListener('click', () => {
            console.log('Botón clickeado para el personaje:', character.name);
            selectCharacter(character);
        });
        
        charactersContainer.appendChild(characterCard);
    });
    
    grid.appendChild(charactersContainer);
}

function selectCharacter(character) {
    console.log('Función selectCharacter llamada con:', character);
    
    if (!gameState.gameId) {
        console.error('No hay ID de juego');
        alert('Error: No se encontró la partida');
        return;
    }

    // Marcar la tarjeta como seleccionada
    const cards = document.querySelectorAll('.character-card');
    cards.forEach(card => card.classList.remove('selected'));
    
    const selectedCard = document.querySelector(`[data-character-id="${character.id}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Guardar el personaje seleccionado en el estado
    gameState.selectedCharacter = character;
    
    // Enviar la selección al servidor
    const message = {
        type: 'selectCharacter',
        gameId: gameState.gameId,
        characterId: character.id
    };
    
    console.log('Enviando mensaje al servidor:', message);
    ws.send(JSON.stringify(message));
}

// Funciones de utilidad
function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
}

// Añadir funciones para manejar el chat y las preguntas
function handleReceiveQuestion(data) {
    addToChatHistory(`${data.from} pregunta: ${data.question}`);
    
    // Mostrar botones de respuesta y ocultar input de pregunta
    document.querySelector('.answer-buttons').classList.remove('hidden');
    document.querySelector('.question-input').classList.add('hidden');
    
    // Guardar la pregunta actual para usarla en la respuesta
    gameState.currentQuestion = data.question;
}

function handleQuestionSent(data) {
    addToChatHistory(`Tú pregunta: ${data.question}`);
    // Deshabilitar el input de pregunta mientras esperamos la respuesta
    document.getElementById('question').disabled = true;
    document.getElementById('send-question').disabled = true;
}

function handleReceiveAnswer(data) {
    addToChatHistory(`${data.from} responde que ${data.answer ? 'Sí' : 'No'}`.toUpperCase());
    // Ocultar botones de respuesta y mostrar input de pregunta
    document.querySelector('.answer-buttons').classList.add('hidden');
    document.querySelector('.question-input').classList.remove('hidden');
    // cambiar color de fondo de la respuesta
    //document.querySelector('.answer-buttons').style.backgroundColor = '#0000bb';
}

function handleTurnChange(data) {
    gameState.currentTurn = data.currentTurn;
    gameState.isMyTurn = data.yourTurn;
    updateTurnIndicator();
    
    const questionInput = document.getElementById('question');
    const sendButton = document.getElementById('send-question');
    const guessButton = document.getElementById('guess-button');
    const timerElement = document.getElementById('question-timer');
    
    if (gameState.isMyTurn) {
        questionInput.disabled = false;
        sendButton.disabled = false;
        guessButton.disabled = false;
        guessButton.style.opacity = '1';
        guessButton.style.cursor = 'pointer';
        startQuestionTimer();
    } else {
        questionInput.disabled = true;
        sendButton.disabled = true;
        guessButton.disabled = true;
        guessButton.style.opacity = '0.5';
        guessButton.style.cursor = 'not-allowed';
        // Mostrar mensaje de espera y temporizador del rival
        //let opponentTime = 25;
        timerElement.textContent = `Espera tu turno`;
        timerElement.classList.add('waiting');
        //
        //const opponentTimer = setInterval(() => {
        //    opponentTime--;
        //    if (opponentTime > 0) {
        //        timerElement.textContent = `Espera tu turno (${opponentTime}s)`;
        //    } else {
        //        clearInterval(opponentTimer);
        //    }
        //}, 1000);
    }
}

function sendQuestion() {
    const questionInput = document.getElementById('question');
    const question = questionInput.value.trim();
    
    if (!question) {
        alert('Por favor, escribe una pregunta');
        return;
    }
    
    if (!gameState.isMyTurn) {
        alert('No es tu turno');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'question',
        gameId: gameState.gameId,
        question: question
    }));
    
    questionInput.value = '';
    cancelQuestionTimer();
}

function sendAnswer(answer) {
    if (!gameState.isMyTurn) {
        alert('No es tu turno para responder');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'answer',
        gameId: gameState.gameId,
        answer: answer,
        question: gameState.currentQuestion
    }));
}

function addToChatHistory(message) {
    const chatHistory = document.getElementById('chat-history');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.textContent = message;
    
    // Añadir el mensaje
    chatHistory.appendChild(messageElement);
    
    // Forzar el scroll hasta abajo
    requestAnimationFrame(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    });
}

// Funciones para el modal de adivinanza
let selectedGuessCharacter = null;

function showGuessModal() {
    if (!gameState.isMyTurn) {
        alert('Solo puedes adivinar durante tu turno');
        return;
    }

    const modal = document.getElementById('guess-modal');
    const grid = document.querySelector('.guess-characters-grid');
    modal.classList.remove('hidden');
    
    // Cargar personajes en el modal
    fetch('/characters.json')
        .then(response => response.json())
        .then(data => {
            grid.innerHTML = '';
            data.characters.forEach(character => {
                const card = document.createElement('div');
                card.className = 'guess-character-card';
                card.dataset.characterId = character.id;
                card.innerHTML = `
                    <img src="${character.image}" alt="${character.name}"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23666%22>${character.name[0]}</text></svg>'">
                    <p>${character.name}</p>
                `;
                
                card.addEventListener('click', () => selectGuessCharacter(character.id));
                grid.appendChild(card);
            });
        });
}

function hideGuessModal() {
    const modal = document.getElementById('guess-modal');
    modal.classList.add('hidden');
    selectedGuessCharacter = null;
    // Limpiar selecciones previas
    document.querySelectorAll('.guess-character-card').forEach(card => {
        card.classList.remove('selected');
    });
}

function selectGuessCharacter(characterId) {
    selectedGuessCharacter = characterId;
    // Actualizar visual de selección
    document.querySelectorAll('.guess-character-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.characterId == characterId) {
            card.classList.add('selected');
        }
    });
}

function submitGuess() {
    if (!selectedGuessCharacter) {
        alert('Por favor, selecciona un personaje');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'guess',
        gameId: gameState.gameId,
        characterId: selectedGuessCharacter
    }));
    
    hideGuessModal();
}

function handleGuessResult(data) {
    const resultModal = document.getElementById('result-modal');
    const resultMessage = document.getElementById('result-message');
    
    // Verificar si soy el jugador que hizo la adivinanza
    const isGuesser = data.guesser === gameState.playerNick;
    
    if (data.correct) {
        if (isGuesser) {
            resultMessage.textContent = '¡CORRECTO, HAS GANADO!';
            resultMessage.style.color = '#2ecc71';
        } else {
            resultMessage.textContent = '¡HAN DESCUBIERTO TU PERSONAJE, HAS PERDIDO!';
            resultMessage.style.color = '#e74c3c';
        }
    } else {
        if (isGuesser) {
            resultMessage.textContent = '¡INCORRECTO, HAS PERDIDO!';
            resultMessage.style.color = '#e74c3c';
        } else {
            resultMessage.textContent = '¡TU OPONENTE NO DESCUBRIÓ TU PERSONAJE, HAS GANADO!';
            resultMessage.style.color = '#2ecc71';
        }
    }
    
    resultModal.classList.remove('hidden');
}

function hideResultModal() {
    const resultModal = document.getElementById('result-modal');
    resultModal.classList.add('hidden');
    
    // Desconectar el WebSocket actual
    if (ws) {
        ws.close();
    }
    
    // Recargar la página con un pequeño retraso para asegurar que la conexión se cierre
    setTimeout(() => {
        window.location.href = window.location.origin;
    }, 500);
}

function handleOpponentDisconnected(data) {
    const resultModal = document.getElementById('result-modal');
    const resultMessage = document.getElementById('result-message');
    
    resultMessage.textContent = data.message;
    resultMessage.style.color = '#2ecc71'; // Color verde para victoria
    
    resultModal.classList.remove('hidden');
}

// Funciones para el manejo del temporizador de pregunta
function startQuestionTimer() {
    // Cancelar cualquier temporizador existente
    cancelQuestionTimer();
    let remainingTime = 30;
    const timerElement = document.getElementById('question-timer');
    
    // Función para actualizar las clases del temporizador según el tiempo restante
    const updateTimerClasses = (time) => {
        timerElement.classList.remove('warning', 'danger');
        if (time <= 10 && time > 5) {
            timerElement.classList.add('warning');
        } else if (time <= 5) {
            timerElement.classList.add('danger');
        }
    };

    timerElement.textContent = remainingTime + 's';
    updateTimerClasses(remainingTime);

    questionTimer = setInterval(() => {
        remainingTime--;
        if (remainingTime > 0) {
            timerElement.textContent = remainingTime + 's';
            updateTimerClasses(remainingTime);
        } else {
            // Limpiar el temporizador
            timerElement.textContent = '';
            timerElement.classList.remove('warning', 'danger');
            
            // Cerrar el modal de adivinanza si está abierto
            const guessModal = document.getElementById('guess-modal');
            if (!guessModal.classList.contains('hidden')) {
                hideGuessModal();
            }

            // Ocultar los botones de respuesta si están visibles
            const answerButtons = document.querySelector('.answer-buttons');
            if (!answerButtons.classList.contains('hidden')) {
                answerButtons.classList.add('hidden');
                document.querySelector('.question-input').classList.remove('hidden');
            }
            
            // Mostrar el modal de tiempo agotado
            const timeoutModal = document.getElementById('timeout-modal');
            timeoutModal.classList.remove('hidden');
            
            // Enviar mensaje al servidor
            ws.send(JSON.stringify({
                type: 'skipQuestion',
                gameId: gameState.gameId
            }));
            
            clearInterval(questionTimer);
            questionTimer = null;

            // Ocultar el modal automáticamente después de 5 segundos
            setTimeout(() => {
                timeoutModal.classList.add('hidden');
            }, 5000);
        }
    }, 1000);
}

function cancelQuestionTimer() {
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    const timerElement = document.getElementById('question-timer');
    
    if (timerElement) {
        timerElement.textContent = '';
        timerElement.classList.remove('warning', 'danger', 'waiting');
    }
}

// Añadir event listener para el botón de cerrar el modal
document.addEventListener('DOMContentLoaded', () => {
    const closeTimeoutBtn = document.getElementById('close-timeout');
    if (closeTimeoutBtn) {
        closeTimeoutBtn.addEventListener('click', () => {
            document.getElementById('timeout-modal').classList.add('hidden');
        });
    }
}); 