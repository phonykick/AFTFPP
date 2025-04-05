// --- Mobile Check ---
function isMobileDevice() {
    // Basic check for touch support or common mobile user agent strings
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

if (isMobileDevice()) {
    // Hide the game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }

    // Display the mobile message
    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '50px';
    messageDiv.style.fontSize = '20px';
    messageDiv.style.color = '#333';
    messageDiv.innerHTML = 'THIS GAME WAS DESIGNED FOR COMPUTERS ONLY.<br>PLEASE COME BACK AND PLAY ON A COMPUTER.';
    document.body.appendChild(messageDiv);

    // Prevent the rest of the game script from running
    // Throwing an error is a simple way to stop execution
    throw new Error("Mobile device detected. Game stopped.");
}
// ---------------------

// Get the canvas and context
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('start-screen-overlay');
const playButton = document.getElementById('play-button');
const restartButton = document.getElementById('restart-btn'); // Get Restart Button
const deleteSaveLinkBottom = document.getElementById('delete-save-link'); // Get bottom delete link

// --- Audio --- ADDED
const paddleHitSound = new Audio('audio/paddle_hit.wav');
const wallHitSound = new Audio('audio/wall_hit.wav');
const scoreSound = new Audio('audio/score.wav');
const redBallPenaltySound = new Audio('audio/red_ball_penalty.wav');
const powerupSound = new Audio('audio/powerup.wav');
const gameOverSound = new Audio('audio/game_over.wav'); // For AI Win
const winSound = new Audio('audio/win.wav'); // ADDED For Player Win
const buttonClickSound = new Audio('audio/button_click.wav'); // ADDED Generic click
// const backgroundMusic = new Audio('audio/bgm.wav'); // REMOVED Old BGM element

// --- Web Audio API Setup for BGM --- ADDED
let audioContext;
let bgmBuffer = null;
let bgmSourceNode = null;
let bgmGainNode;
let isBgmPlaying = false;
let isBgmLoaded = false;

function initAudioContext() {
    try {
        if (!audioContext) {
            console.log("Attempting to create AudioContext...");
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log(`AudioContext created. Initial state: ${audioContext.state}`);
            bgmGainNode = audioContext.createGain();
            bgmGainNode.gain.value = 0.125; // Quieter volume
            bgmGainNode.connect(audioContext.destination);
            console.log("GainNode created and connected.");
        }
         // Resume context on user interaction if needed
        if (audioContext.state === 'suspended') {
            console.log("AudioContext is suspended. Attempting to resume...");
            audioContext.resume().then(() => {
                console.log(`AudioContext resumed. Current state: ${audioContext.state}`);
            }).catch(err => {
                 console.error("Failed to resume AudioContext:", err);
            });
        } else {
            console.log(`AudioContext state is already: ${audioContext.state}`);
        }
    } catch (e) {
        console.error("Error initializing AudioContext:", e);
    }
}

async function loadBGM() {
    if (!audioContext) {
        console.log("loadBGM: AudioContext not ready, aborting load.");
        return;
    }
    if (isBgmLoaded) {
         console.log("loadBGM: BGM already loaded.");
         return;
    }
    console.log("loadBGM: Attempting to fetch and decode bgm.wav...");
    try {
        const response = await fetch('audio/bgm.wav');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log("loadBGM: Audio file fetched successfully.");
        bgmBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isBgmLoaded = true;
        console.log("BGM loaded and decoded successfully.");
    } catch (error) {
        console.error("Failed to load or decode BGM:", error);
        isBgmLoaded = false;
    }
}

function playBGM() {
    console.log(`playBGM called. isLoaded: ${isBgmLoaded}, isPlaying: ${isBgmPlaying}, contextState: ${audioContext ? audioContext.state : 'null'}`);
    if (!isBgmLoaded || !audioContext || audioContext.state !== 'running') {
         console.log("playBGM: Conditions not met (not loaded, context not ready/running). Aborting play.");
         if (audioContext && audioContext.state === 'suspended') {
             console.log("playBGM: Attempting to resume suspended context...");
             initAudioContext(); // Try resuming
         }
         return; 
    }
    if (isBgmPlaying) {
        console.log("playBGM: Already playing. Aborting.");
        return;
    }
    
    // Stop existing source if somehow still lingering
    if (bgmSourceNode) {
        try { 
            console.log("playBGM: Stopping lingering source node.");
            bgmSourceNode.stop(); 
        } catch (e) {}
    }

    console.log("playBGM: Creating and starting new source node.");
    bgmSourceNode = audioContext.createBufferSource();
    bgmSourceNode.buffer = bgmBuffer;
    bgmSourceNode.loop = true;
    bgmSourceNode.connect(bgmGainNode);
    try {
        bgmSourceNode.start(0);
        isBgmPlaying = true;
        console.log("BGM started successfully.");
    } catch (e) {
        console.error("Error starting BGM source node:", e);
        isBgmPlaying = false;
    }
}

function stopBGM() {
    console.log(`stopBGM called. isPlaying: ${isBgmPlaying}, sourceNode exists: ${!!bgmSourceNode}`);
    if (bgmSourceNode && isBgmPlaying) {
        try {
            bgmSourceNode.stop(0); // Stop immediately
            console.log("BGM source node stopped.");
        } catch (e) {
            console.warn("Warning stopping BGM source node (might be already stopped):", e);
        }
        bgmSourceNode.disconnect(); // Disconnect node
        bgmSourceNode = null; // Discard the node
        isBgmPlaying = false;
    } else if (!isBgmPlaying) {
        console.log("stopBGM: Not currently playing.");
    }
}
// --- End Web Audio API ---

// Adjust volume for specific sounds if needed
redBallPenaltySound.volume = 0.60; // Reduced volume further to 60%
// backgroundMusic.volume = 0.25; // REMOVED
// backgroundMusic.loop = true; // REMOVED

function playSound(soundObject) {
    // Reset playback to allow rapid replays (like paddle hits)
    soundObject.currentTime = 0;
    soundObject.play().catch(error => {
        // Prevent console spam if user hasn't added the file yet
        // console.error(`Error playing sound ${soundObject.src}:`, error);
    });
}
// -------------

// --- Function to handle BGM playback --- ADDED // REMOVED Old function
// function controlBackgroundMusic(action) { ... }
// -------------------------------------- // REMOVED

// --- Add Event Listeners ---
playButton.addEventListener('click', () => { // Wrap startGame to add sound
    playSound(buttonClickSound);
    initAudioContext(); // Initialize/resume on first click
    if (!isBgmLoaded) {
        loadBGM().then(() => { // Load BGM if not already loaded
           playBGM(); // Play after loading
        });
    } else {
        playBGM(); // Play directly if already loaded
    }
    startGame();
});
if (restartButton) {
    restartButton.addEventListener('click', () => { // Wrap initializeGame to add sound
        playSound(buttonClickSound);
        initializeGame();
    });
}
if (deleteSaveLinkBottom) { 
    deleteSaveLinkBottom.addEventListener('click', () => { // Wrap deleteSaveData to add sound
         playSound(buttonClickSound);
         deleteSaveData(); // Need to ensure deleteSaveData itself doesn't have listener
    }); 
} else {
    console.error("Bottom delete save link (#delete-save-link) not found!");
}
// -------------------------------------------

// Game elements
const initialPaddleHeight = 100; // Store original height for reset and calculation
const paddleWidth = 10;
// let paddleHeight = 100; // This will now be part of player/ai objects
const ballSize = 10;
const baseBallSpeed = 5; // Base speed for calculations and revert
const aiErrorMargin = 110;
const redBallChance = 0.25;
const initialHearts = 3;
const maxHearts = 5; // Maximum hearts a player can have
const winningScore = 30; // Score needed to win (changed back to 30)

// --- Upgrade System Constants --- ADDED
const MAX_UPGRADE_LEVEL = 5;

const UPGRADE_COSTS = {
    paddleLength:  { base: 5,  multiplier: 1.5 }, // Halved base cost
    paddleGrip:    { base: 8,  multiplier: 1.6 }, // Reduced base cost
    coinBonus:     { base: 12, multiplier: 1.8 }, // Reduced base cost
    startingScore: { base: 5,  multiplier: 1.5 }, // Halved base cost
    extraHeart:    { base: 25, multiplier: 2.0 }  // Halved base cost
};

const UPGRADE_EFFECTS = {
    paddleLength:  { scale: 0.08 }, // CHANGED: 4% per level (Max 20% or 120px total at level 5)
    paddleGrip:    { scale: 0.10 }, // 10% less angle change per level (Max 50% at level 5)
    coinBonus:     { scale: 0.05 }, // 5% more coins per level (Max 25% at level 5)
    startingScore: { scale: 1 },    // +1 starting score per level
    extraHeart:    { scale: 1 }     // +1 starting heart per level
};
// -------------------------------

// Power-up Constants
const powerupSize = 25; // Increased size
const maxPowerups = 2;
const powerupSpawnInterval = 3000; // 3 seconds (Increased spawn rate)
const powerupSpawnChance = 0.40; // 40% chance per interval (Increased spawn rate)
const powerupTypes = [
    { type: 'increaseSelfPaddle', color: 'lightgreen' },
    { type: 'decreaseOpponentPaddle', color: 'orange' },
    { type: 'multiBall', color: 'cyan' },
    { type: 'speedBoost', color: 'yellow' },
    { type: 'extraHeart', color: 'pink' },
    { type: 'doubleScore', color: 'purple' }
];
const minPaddleHeight = initialPaddleHeight * 0.5; // Prevent paddles shrinking too much
const multiBallDuration = 15000; // 15 seconds
const speedBoostDuration = 15000; // 15 seconds
const doubleScoreDuration = 30000; // 30 seconds

// Game state
let gameRunning = false;
let gameOverMessage = "";
let playerScore = 0;
let aiScore = 0;
let playerHearts = initialHearts;
let aiHearts = initialHearts;
let activePowerups = [];
let balls = []; // Array to hold all active balls
let multiBallTimerIds = []; // To track removal timers
let isSpeedBoostActive = false; // Track if speed boost is active
let speedBoostTimerId = null; // Timer for reverting speed boost
let isPlayerScoreDoubled = false; // Track player double score
let playerDoubleScoreTimerId = null;
let isAiScoreDoubled = false; // Track AI double score
let aiDoubleScoreTimerId = null;
let currentGameLoopId = null; // ID for requestAnimationFrame
let isPausedByMouse = false; // Track pause state due to mouse leaving canvas
let totalCoins = 0; // <-- ENSURE this exists
let powerupSpawnTimerId = null; // Declare the missing timer ID variable

// --- Save Data Object --- 
let saveData = {
    totalCoins: 0,
    upgrades: {
        paddleLength: 0,      // Level 0-5
        paddleGrip: 0,          // Level 0-5
        coinBonus: 0,         // Level 0-5
        startingScore: 0,     // Level 0-5
        extraHeart: 0,        // Level 0-5
    }
};
// -----------------------

// Player paddle (Initial values set in initializeGame based on upgrades)
const player = {
    x: 10,
    y: canvas.height / 2 - initialPaddleHeight / 2,
    width: paddleWidth,
    height: initialPaddleHeight, // Base height, adjusted by upgrades
    speed: 8,
    dy: 0
};

// AI paddle (remains standard)
const ai = {
    x: canvas.width - paddleWidth - 10,
    y: canvas.height / 2 - initialPaddleHeight / 2,
    width: paddleWidth,
    height: initialPaddleHeight,
    speed: 3
};

// Update score, hearts, and TOTAL coins display
function updateUI() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('ai-score').textContent = aiScore;
    document.getElementById('player-hearts').textContent = playerHearts;
    document.getElementById('ai-hearts').textContent = aiHearts;
    const coinsElement = document.getElementById('total-coins');
    if (coinsElement) {
        coinsElement.textContent = saveData.totalCoins; // Use saveData
    }
    // We'll add shop UI updates later
}

// Draw game elements
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // --- Draw Pause Message --- 
    if (isPausedByMouse) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
        // Don't return here, we still want to see the underlying game state
    }
    // --------------------------

    // Only draw game over screen if game isn't running AND there's a game over message
    if (!gameRunning && !isPausedByMouse && gameOverMessage) { 
        ctx.fillStyle = '#fff'; // Default color
        ctx.font = 'bold 50px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        const lines = gameOverMessage.split('\n');
        let yOffset = 0;
        if (lines.length > 1) {
            yOffset = -15 * (lines.length -1);
        }
        
        // Draw message lines, checking for coin info
        lines.forEach((line, index) => {
             let drawText = line;
             if (line.startsWith("COIN_INFO:")) { // Check for marker
                 ctx.fillStyle = 'Goldenrod'; // Set color for coin line
                 drawText = line.substring("COIN_INFO:".length); // Remove marker
             } else {
                 ctx.fillStyle = '#fff'; // Ensure default color for other lines
             }
             ctx.fillText(drawText, canvas.width / 2, canvas.height / 2 - 40 + yOffset + (index * 50));
        });
        
        // Reset fillStyle just in case
        ctx.fillStyle = '#fff'; 
       
        // Prompt to continue to shop
        ctx.font = 'bold 24px "Courier New", Courier, monospace';
        ctx.fillText("Click or Press Enter for Shop", canvas.width / 2, canvas.height / 2 + 40 + yOffset); 
    }
    
    // Draw paddles (only if game running or paused)
    if (gameRunning || isPausedByMouse) {
        ctx.fillStyle = '#fff';
        
        // Player paddle
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // AI paddle
        ctx.fillRect(ai.x, ai.y, ai.width, ai.height);
        
        // Draw ALL balls
        balls.forEach(currentBall => {
            ctx.beginPath();
            ctx.arc(currentBall.x, currentBall.y, currentBall.size, 0, Math.PI * 2);
            ctx.fillStyle = currentBall.isRed ? 'red' : '#fff';
            ctx.fill();
            ctx.closePath();
        });
        
        // Draw Powerups
        activePowerups.forEach(powerup => {
            ctx.fillStyle = powerup.color;
            ctx.fillRect(powerup.x, powerup.y, powerup.size, powerup.size);
            // Could also draw icons or letters inside
        });
        
        // Draw center line
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
        ctx.closePath();
        ctx.setLineDash([]);
    }
}

// Check for collisions
function collision(ball, paddle) {
    return ball.x - ball.size < paddle.x + paddle.width &&
           ball.x + ball.size > paddle.x &&
           ball.y - ball.size < paddle.y + paddle.height &&
           ball.y + ball.size > paddle.y;
}

// AI movement logic
function moveAI() {
    if (balls.length === 0) return; // No ball to track
    const primaryBall = balls[0];
    const paddleCenter = ai.y + ai.height / 2;
    const targetY = primaryBall.y; // Target based on ball's current Y
    const dodgeChance = 0.5;
    // --- AI Logic --- 
    if (primaryBall.dx > 0) { // Only react if ball is moving towards AI

        let shouldDodge = false;
        if (primaryBall.isRed && Math.random() < dodgeChance) {
            shouldDodge = true;
        }

        if (shouldDodge) {
            // --- Dodging Logic ---
            if (targetY < paddleCenter) { 
                // Ball is above paddle center, move DOWN to dodge
                ai.y += ai.speed;
            } else if (targetY > paddleCenter) { 
                 // Ball is below paddle center, move UP to dodge
                ai.y -= ai.speed;
            }
            // If ball is exactly at center, AI might stay still briefly

        } else {
             // --- Intercept Logic (existing) ---
             // Use inaccurate target for interception
             const interceptTargetY = targetY + (Math.random() - 0.5) * aiErrorMargin;
             if (paddleCenter < interceptTargetY) { 
                ai.y += ai.speed;
            } else if (paddleCenter > interceptTargetY) {
                ai.y -= ai.speed;
            }
        }
    }
    
    // Keep paddle within canvas bounds (applies regardless of dodging/intercepting)
    if (ai.y < 0) {
        ai.y = 0;
    } else if (ai.y + ai.height > canvas.height) {
        ai.y = canvas.height - ai.height;
    }
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Move player paddle
    player.y += player.dy;
    // Keep player paddle within canvas bounds
    if (player.y < 0) {
        player.y = 0;
    } else if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
    
    // Move AI
    moveAI();
    
    // --- Update ALL Balls ---
    for (let i = balls.length - 1; i >= 0; i--) {
        let currentBall = balls[i];

        // Store ball state before potential collision
        const ballX_before = currentBall.x;
        const ballY_before = currentBall.y;
        const wasRed_before = currentBall.isRed;

        // Move ball
        currentBall.x += currentBall.dx;
        currentBall.y += currentBall.dy;

        // Powerup Collision Check
        checkPowerupCollision(currentBall);

        // Wall collision (top and bottom)
        if (currentBall.y - currentBall.size < 0 || currentBall.y + currentBall.size > canvas.height) {
            currentBall.dy *= -1;
            // Prevent sticking to top/bottom wall
            if (currentBall.y - currentBall.size < 0) currentBall.y = currentBall.size;
            if (currentBall.y + currentBall.size > canvas.height) currentBall.y = canvas.height - currentBall.size;
            playSound(wallHitSound); // ADDED Wall hit sound
        }

        // --- Ball collision with paddles (Revised Logic) ---
        const playerHit = collision(currentBall, player);
        const aiHit = !playerHit && collision(currentBall, ai); // Check AI only if player didn't hit

        if (playerHit) {
            // --- Process Player Hit ---
            
            // Apply heart penalty OR score point based on ball color BEFORE hit
            if (wasRed_before) {
                playerHearts--;
                playSound(redBallPenaltySound); // ADDED Red ball hit sound
                console.log("Player hit RED ball! Hearts:", playerHearts);
            } else {
                const pointsToAdd = isPlayerScoreDoubled ? 2 : 1; // Check for double score
                playerScore += pointsToAdd;
                playSound(paddleHitSound); // ADDED Paddle hit sound (white ball)
                console.log(`Player hit WHITE ball! Score: +${pointsToAdd} -> ${playerScore}`);
            }
            updateUI(); // Update display immediately

            // --- Calculate bounce physics --- 
            const gripFactor = 1 - (saveData.upgrades.paddleGrip * 0.10); 
            let collidePoint = (currentBall.y - (player.y + player.height / 2)) / (player.height / 2);
            let angleRad = collidePoint * (Math.PI / 4); 
            let currentSpeed = Math.sqrt(currentBall.dx**2 + currentBall.dy**2);
            currentBall.dx = currentSpeed * Math.cos(angleRad);
            currentBall.dy = currentSpeed * Math.sin(angleRad) * gripFactor; 
            // --- End bounce physics ---

            currentBall.lastHitBy = 'player';
            currentBall.isRed = Math.random() < redBallChance; // Determine if it TURNS red

            if (currentBall.dx < 0) currentBall.dx *= -1; // Ensure it moves away
            currentBall.x = player.x + player.width + currentBall.size; // Prevent sticking

        } else if (aiHit) {
             // --- Process AI Hit ---

             // Apply heart penalty OR score point based on ball color BEFORE hit
             if (wasRed_before) {
                 aiHearts--;
                 playSound(redBallPenaltySound); // ADDED Red ball hit sound
                 console.log("AI hit RED ball! Hearts:", aiHearts);
             } else {
                 const pointsToAdd = isAiScoreDoubled ? 2 : 1; // Check for double score
                 aiScore += pointsToAdd;
                 playSound(paddleHitSound); // ADDED Paddle hit sound (white ball)
                 console.log(`AI hit WHITE ball! Score: +${pointsToAdd} -> ${aiScore}`);
             }
             updateUI(); // Update display immediately

            // --- Calculate bounce physics --- 
            let collidePoint = (currentBall.y - (ai.y + ai.height / 2)) / (ai.height / 2);
            let angleRad = collidePoint * (Math.PI / 4); 
            let currentSpeed = Math.sqrt(currentBall.dx**2 + currentBall.dy**2);
            currentBall.dx = currentSpeed * -Math.cos(angleRad); 
            currentBall.dy = currentSpeed * Math.sin(angleRad); 
            // --- End bounce physics ---

            currentBall.lastHitBy = 'ai';
            currentBall.isRed = Math.random() < redBallChance; // Determine if it TURNS red

            if (currentBall.dx > 0) currentBall.dx *= -1; // Ensure it moves away
            currentBall.x = ai.x - currentBall.size; // Prevent sticking
        }

        // --- Score points / Handle missed balls (Revised Logic) ---
        let scoredOnMiss = false;
        let missScorer = null;
        const baseMissPointsToAdd = 2; // Base points for a missed WHITE ball

        // Check if ball went out of bounds AFTER potential collision adjustments
        if (currentBall.x - currentBall.size < 0) { // Passed player side (AI scores on miss)
            if (!wasRed_before) { 
                missScorer = 'ai';
                const actualMissPoints = isAiScoreDoubled ? baseMissPointsToAdd * 2 : baseMissPointsToAdd; // Check for double score
                aiScore += actualMissPoints;
                scoredOnMiss = true;
                console.log(`Player missed WHITE ball! AI Score: +${actualMissPoints} -> ${aiScore}`);
            } else {
                 scoredOnMiss = true; 
                 console.log(`Player missed RED ball! No score change.`);
            }
        } else if (currentBall.x + currentBall.size > canvas.width) { // Passed AI side (Player scores on miss)
             if (!wasRed_before) { 
                 missScorer = 'player';
                 const actualMissPoints = isPlayerScoreDoubled ? baseMissPointsToAdd * 2 : baseMissPointsToAdd; // Check for double score
                 playerScore += actualMissPoints;
                 scoredOnMiss = true;
                 console.log(`AI missed WHITE ball! Player Score: +${actualMissPoints} -> ${playerScore}`);
             } else {
                 scoredOnMiss = true; 
                 console.log(`AI missed RED ball! No score change.`);
             }
        }

        if (scoredOnMiss) {
            // Sound effect now played based on missScorer check
            if (missScorer) {
                 playSound(scoreSound);
            }
            // Ball removal/reset logic (no change needed here)
            if (i === 0 && balls.length > 1) {
                balls.splice(i, 1);
            } else if (i === 0 && balls.length === 1){
                resetBalls(); 
            } else if (i > 0) {
                balls.splice(i, 1);
            }
            updateUI(); // Update display
            
            // If resetBalls was called, it empties the array, so break the loop
            if (balls.length === 0) break; 
        }
    } // End loop through balls
}

// Game loop
function gameLoop() {
    if (!gameRunning && !isPausedByMouse) {
        cancelAnimationFrame(currentGameLoopId); // Stop the loop if game over or paused externally
        currentGameLoopId = null; // Clear the ID
        draw(); // Draw the final game over screen
        return;
    }

    // Check for game over conditions BEFORE updating
    if (playerHearts <= 0) {
        playSound(gameOverSound); // AI Wins
        win("AI WINS!"); // No coin info marker needed
        return; // Stop the loop
    }
    if (aiHearts <= 0) {
        playSound(winSound); // Player Wins
        const coinMultiplier = 1 + (saveData.upgrades.coinBonus * 0.05);
        const coinsWon = Math.floor((playerScore + (playerHearts * 2)) * coinMultiplier);
        saveData.totalCoins += coinsWon;
        saveAllData();
        // ADDED COIN_INFO marker to the coins line
        win(`YOU WIN!\nCOIN_INFO:(+${coinsWon} coins)`); 
        return; // Stop the loop
    }
    if (playerScore >= winningScore) {
        playSound(winSound); // Player Wins
        const coinMultiplier = 1 + (saveData.upgrades.coinBonus * 0.05); 
        const coinsWon = Math.floor((playerScore + (playerHearts * 2)) * coinMultiplier);
        saveData.totalCoins += coinsWon; 
        saveAllData();
        // ADDED COIN_INFO marker to the coins line
        win(`YOU WIN!\nCOIN_INFO:(+${coinsWon} coins)`); 
        return; // Stop the loop
    }
    if (aiScore >= winningScore) {
        playSound(gameOverSound); // AI Wins
        win("AI WINS!"); // No coin info marker needed
        return; // Stop the loop
    }

    // If paused by mouse, just draw and skip updates
    if (isPausedByMouse) {
        draw(); // Draw the paused state
        currentGameLoopId = requestAnimationFrame(gameLoop); // Continue the loop for drawing
        return;
    }

    update(); // Update game state (move paddles, ball, check collisions)
    draw();   // Draw the updated game state

    // Request the next frame
    
    currentGameLoopId = requestAnimationFrame(gameLoop);
}

// Event listeners for paddle control
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') {
        player.dy = -player.speed;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        player.dy = player.speed;
    }
});

document.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowUp' || e.key === 'w') && player.dy < 0 ||
        (e.key === 'ArrowDown' || e.key === 's') && player.dy > 0) {
        player.dy = 0;
    }
});

// --- DEBUG WIN SHORTCUT --- ADDED
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        console.log("DEBUG: Ctrl+X pressed. Triggering win...");
        if (gameRunning) { 
            saveData.totalCoins += 999; 
            saveAllData();
            // ADDED COIN_INFO marker to the coins line
            win(`DEBUG WIN!\nCOIN_INFO:(+999 coins)`); 
        }
    }
});
// -------------------------

// Mouse control
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    player.y = mouseY - player.height / 2;
    
    // Keep paddle within canvas
    if (player.y < 0) {
        player.y = 0;
    } else if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
});

// --- Power-up Functions ---
function spawnPowerup() {
    if (!gameRunning || activePowerups.length >= maxPowerups) {
        return;
    }

    if (Math.random() < powerupSpawnChance) {
        // Select a random power-up type from the available ones
        const powerupIndex = Math.floor(Math.random() * powerupTypes.length);
        const powerupTypeData = powerupTypes[powerupIndex];

        // Calculate spawn position (avoid edges and paddles)
        const spawnPadding = 50;
        const x = Math.random() * (canvas.width - spawnPadding * 2 - powerupSize) + spawnPadding;
        const y = Math.random() * (canvas.height - powerupSize * 2) + powerupSize;

        activePowerups.push({
            x: x,
            y: y,
            size: powerupSize,
            type: powerupTypeData.type,
            color: powerupTypeData.color
        });
    }
}

function startPowerupSpawner() {
    if (powerupSpawnTimerId) clearInterval(powerupSpawnTimerId); // Clear existing timer if any
    powerupSpawnTimerId = setInterval(spawnPowerup, powerupSpawnInterval);
}

function stopPowerupSpawner() {
     if (powerupSpawnTimerId) clearInterval(powerupSpawnTimerId);
     powerupSpawnTimerId = null;
}

function checkPowerupCollision(currentBall) {
    for (let i = activePowerups.length - 1; i >= 0; i--) {
        const powerup = activePowerups[i];
        // Simple Axis-Aligned Bounding Box (AABB) collision for ball-powerup
        const ballLeft = currentBall.x - currentBall.size;
        const ballRight = currentBall.x + currentBall.size;
        const ballTop = currentBall.y - currentBall.size;
        const ballBottom = currentBall.y + currentBall.size;

        const powerupLeft = powerup.x;
        const powerupRight = powerup.x + powerup.size;
        const powerupTop = powerup.y;
        const powerupBottom = powerup.y + powerup.size;

        if (ballRight > powerupLeft && ballLeft < powerupRight &&
            ballBottom > powerupTop && ballTop < powerupBottom) {
            applyPowerupEffect(currentBall.lastHitBy, powerup.type, currentBall);
            activePowerups.splice(i, 1);
            break;
        }
    }
}

function applyPowerupEffect(collector, type, collectedByBall) {
    if (!collector) return;

    switch (type) {
        case 'increaseSelfPaddle':
            if (collector === 'player') {
                player.height *= 1.2; // Increase by 20%
                // Optional: Prevent paddle going off bottom - adjust y
                if (player.y + player.height > canvas.height) {
                     player.y = canvas.height - player.height;
                }
            } else { // collector === 'ai'
                ai.height *= 1.2; // Increase by 20%
                 if (ai.y + ai.height > canvas.height) {
                     ai.y = canvas.height - ai.height;
                }
            }
            break;
        case 'decreaseOpponentPaddle':
            if (collector === 'player') { // Player collected, shrink AI
                ai.height *= 0.9; // Decrease by 10%
                if (ai.height < minPaddleHeight) {
                    ai.height = minPaddleHeight;
                }
                // AI paddle might shift up, recenter it slightly if needed (optional)
                 ai.y += (initialPaddleHeight * 0.1) / 2; // Adjust y to keep center somewhat aligned
                 if (ai.y + ai.height > canvas.height) { // Ensure it stays within bounds
                    ai.y = canvas.height - ai.height;
                 } else if (ai.y < 0) {
                     ai.y = 0;
                 }
            } else { // AI collected, shrink Player
                player.height *= 0.9;
                 if (player.height < minPaddleHeight) {
                    player.height = minPaddleHeight;
                }
                 player.y += (initialPaddleHeight * 0.1) / 2;
                 if (player.y + player.height > canvas.height) {
                    player.y = canvas.height - player.height;
                 } else if (player.y < 0) {
                     player.y = 0;
                 }
            }
            break;
        case 'multiBall':
            const newBall = createBall();
            // Optional: Spawn near the collecting ball slightly offset?
            // newBall.x = collectedByBall.x + (Math.random() - 0.5) * 20;
            // newBall.y = collectedByBall.y + (Math.random() - 0.5) * 20;
            balls.push(newBall);

            // Set timer to remove this specific ball
            const timerId = setTimeout(() => {
                // Find the ball by its unique ID and remove it
                const ballIndex = balls.findIndex(b => b.id === newBall.id);
                if (ballIndex !== -1 && ballIndex !== 0) { // Don't remove primary ball via timer
                    balls.splice(ballIndex, 1);
                }
                // Remove this timer ID from the tracking array
                const timerIndex = multiBallTimerIds.indexOf(timerId);
                if (timerIndex !== -1) {
                    multiBallTimerIds.splice(timerIndex, 1);
                }
            }, multiBallDuration);
            multiBallTimerIds.push(timerId); // Track the timer
            break;
        case 'speedBoost':
            // Clear previous timer if player collects again quickly
            if (speedBoostTimerId) clearTimeout(speedBoostTimerId);

            if (!isSpeedBoostActive) {
                // Boost all current balls ONLY if not already boosted
                isSpeedBoostActive = true;
                balls.forEach(boostBallSpeed);
            }

            // Set (or reset) the timer to revert speed
            speedBoostTimerId = setTimeout(() => {
                isSpeedBoostActive = false;
                balls.forEach(revertBallSpeed); // Revert speed for all balls currently present
                speedBoostTimerId = null; // Clear the stored timer ID
            }, speedBoostDuration);
            break;
        case 'extraHeart':
            if (collector === 'player') {
                if (playerHearts < maxHearts) {
                    playerHearts++;
                }
            } else { // collector === 'ai'
                if (aiHearts < maxHearts) {
                    aiHearts++;
                }
            }
            updateUI(); // Update display after heart change
            break;
        case 'doubleScore':
            if (collector === 'player') {
                // Clear previous timer if player collects again quickly
                if (playerDoubleScoreTimerId) clearTimeout(playerDoubleScoreTimerId);
                isPlayerScoreDoubled = true;
                playerDoubleScoreTimerId = setTimeout(() => {
                    isPlayerScoreDoubled = false;
                    playerDoubleScoreTimerId = null;
                }, doubleScoreDuration);
            } else { // collector === 'ai'
                // Clear previous timer if AI collects again quickly
                 if (aiDoubleScoreTimerId) clearTimeout(aiDoubleScoreTimerId);
                 isAiScoreDoubled = true;
                 aiDoubleScoreTimerId = setTimeout(() => {
                    isAiScoreDoubled = false;
                    aiDoubleScoreTimerId = null;
                }, doubleScoreDuration);
            }
            break;
    }
    playSound(powerupSound); // ADDED Powerup collect sound
}

// --- Ball Creation & Reset ---
function createBall() {
    // Ensure a minimum horizontal component for the initial direction
    const maxVerticalRatio = 0.7; // Max dy as a fraction of total speed
    const randomDy = (Math.random() * 2 - 1) * baseBallSpeed * maxVerticalRatio; // Random dy between +/- max ratio
    const dxMagnitude = Math.sqrt(baseBallSpeed**2 - randomDy**2); // Calculate dx to maintain base speed
    const randomDx = dxMagnitude * (Math.random() > 0.5 ? 1 : -1); // Randomly left or right

    const speedFactor = isSpeedBoostActive ? 2 : 1; // Apply boost if active

    const newBall = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: ballSize,
        dx: randomDx * speedFactor, // Apply boost factor here
        dy: randomDy * speedFactor, // And here
        isRed: false,
        lastHitBy: null,
        id: Date.now() + Math.random()
    };
    
    return newBall;
}

function resetBalls() {
    // Clear multi-ball timers
    multiBallTimerIds.forEach(clearTimeout);
    multiBallTimerIds = [];
    // Clear speed boost
    if (speedBoostTimerId) clearTimeout(speedBoostTimerId);
    speedBoostTimerId = null;
    isSpeedBoostActive = false;
    // Create the initial ball (will have base speed)
    balls = [createBall()];
}

// --- Helper functions for speed boost ---
function boostBallSpeed(ball) {
    ball.dx *= 2;
    ball.dy *= 2;
}

function revertBallSpeed(ball) {
    // Avoid reverting if speed was changed by other means after boost ended
    // This basic revert assumes speed wasn't drastically changed by hits since boost start
    ball.dx /= 2;
    ball.dy /= 2;
}
// -------------------------------------

// --- Mouse Pause/Resume Listeners ---
canvas.addEventListener('mouseleave', () => {
    if (gameRunning) { // Only pause if game is actually running
        isPausedByMouse = true;
        cancelAnimationFrame(currentGameLoopId); // Stop game loop
        stopPowerupSpawner(); // Stop powerups spawning when paused
        stopBGM(); // Stop BGM using Web Audio API
        draw(); // Draw the pause overlay immediately
    }
});

canvas.addEventListener('mouseenter', () => {
    if (isPausedByMouse) { // Only resume if paused *by mouse*
        isPausedByMouse = false;
        if (gameRunning) { // Double-check game should be running
            initAudioContext(); // Ensure context is active
            playBGM(); // Resume BGM using Web Audio API
            startPowerupSpawner(); // Resume powerups
            gameLoop(); // Resume game loop
        }
    }
});
// ------------------------------------

// --- Game Initialization Function ---
function initializeGame() {
    
    // Load save data FIRST
    loadData();

    // --- Stop existing game processes FIRST --- 
    if (currentGameLoopId) {
        cancelAnimationFrame(currentGameLoopId);
        currentGameLoopId = null;
    }
    stopPowerupSpawner();
    // Clear all active timers related to powerups
    clearTimeout(playerDoubleScoreTimerId);
    clearTimeout(aiDoubleScoreTimerId);
    clearTimeout(speedBoostTimerId);
    multiBallTimerIds.forEach(clearTimeout);
    multiBallTimerIds = [];
     // -----------------------------------------

    // Reset scores and hearts based on upgrades
    playerScore = saveData.upgrades.startingScore; // Apply starting score upgrade
    aiScore = 0;
    playerHearts = Math.min(initialHearts + saveData.upgrades.extraHeart, maxHearts); // Apply heart upgrade, capped
    aiHearts = initialHearts;

    // Reset paddles to initial state, apply length upgrade
    const lengthMultiplier = 1 + (saveData.upgrades.paddleLength * 0.08); // CHANGED scale to 0.08
    player.height = initialPaddleHeight * lengthMultiplier;
    player.y = canvas.height / 2 - player.height / 2; // Recenter
    player.dy = 0;
    ai.height = initialPaddleHeight; // AI paddle standard
    ai.y = canvas.height / 2 - ai.height / 2;

    // Reset balls
    resetBalls(); // This function should handle clearing ball timers too

    // Reset powerup states
    activePowerups = [];
    isPlayerScoreDoubled = false;
    isAiScoreDoubled = false;
    isSpeedBoostActive = false;
    speedBoostTimerId = null;
    playerDoubleScoreTimerId = null;
    aiDoubleScoreTimerId = null;

    // Reset game state flags
    gameRunning = false; 
    gameOverMessage = ""; // Clear game over message EARLY
    isPausedByMouse = false;

    // Reset UI elements
    startOverlay.style.display = 'flex'; 
    playButton.disabled = false; 

    // Setup play button listener (remove previous, add new)
    playButton.removeEventListener('click', startGame);
    playButton.addEventListener('click', startGame);

    // Hide shop overlay if it was visible
    const shopOverlay = document.getElementById('shop-screen-overlay');
    if (shopOverlay) shopOverlay.style.display = 'none';

    // Initial UI update (AFTER loading data and setting initial states)
    updateUI();

    // DEBUG: Log before final draw in initializeGame
    console.log(`initializeGame: gameOverMessage before final draw: '${gameOverMessage}'`); 

    // Draw initial state (e.g., paddles in place, score 0)
    // This might be needed if the canvas isn't completely hidden by the overlay
    draw();

    stopBGM(); // Stop BGM on restart/init
}

// Function called when game ends
let shopTransitionHandler = null; // To store the click/keypress listener

function win(message) {
    console.log("Win function called with:", message);
    gameRunning = false;
    gameOverMessage = message;
    
    // --- Clean up game state --- 
    stopPowerupSpawner(); // Stop powerups spawning
    // Clear all active timers related to powerups
    clearTimeout(playerDoubleScoreTimerId);
    clearTimeout(aiDoubleScoreTimerId);
    clearTimeout(speedBoostTimerId);
    multiBallTimerIds.forEach(clearTimeout);
    multiBallTimerIds = [];
    // Reset powerup state flags
    isPlayerScoreDoubled = false;
    isAiScoreDoubled = false;
    isSpeedBoostActive = false;
    speedBoostTimerId = null;
    playerDoubleScoreTimerId = null;
    aiDoubleScoreTimerId = null;
    // ---------------------------

    // Explicitly draw the game over screen with the shop prompt
    draw(); 
    console.log("Drawing game over screen, awaiting shop transition.");

    // --- Setup transition to shop --- 
    // Remove previous listener if any
    if (shopTransitionHandler) {
        document.removeEventListener('click', shopTransitionHandler);
        document.removeEventListener('keydown', shopTransitionHandler);
    }
    
    shopTransitionHandler = (event) => {
        // Check for click or Enter key
        if (event.type === 'click' || (event.type === 'keydown' && event.key === 'Enter')) {
             // Remove this listener
             document.removeEventListener('click', shopTransitionHandler);
             document.removeEventListener('keydown', shopTransitionHandler);
             shopTransitionHandler = null; // Clear the stored handler
             // Show the shop
             showShop();
        }
    };

    // Add the new listener
    document.addEventListener('click', shopTransitionHandler);
    document.addEventListener('keydown', shopTransitionHandler);
    // -----------------------------

    stopBGM(); // Stop BGM on game over
}

// --- Save/Load Functions (Refactored) ---
function saveAllData() {
    try {
        localStorage.setItem('pongSaveData', JSON.stringify(saveData));
        console.log("Data saved:", saveData);
    } catch (error) {
        console.error("Failed to save data:", error);
    }
}

function loadData() {
    try {
        const loadedData = localStorage.getItem('pongSaveData');
        if (loadedData) {
            saveData = JSON.parse(loadedData);
            console.log("Data loaded:", saveData);
            // Ensure structure is valid (simple check)
            if (!saveData.upgrades) {
                 console.warn("Loaded data missing upgrades object, resetting upgrades.");
                 saveData.upgrades = { paddleLength: 0, paddleGrip: 0, coinBonus: 0, startingScore: 0, extraHeart: 0 };
            }
        } else {
            console.log("No save data found, using defaults.");
            // Initialize default structure if no save exists
            saveData = {
                totalCoins: 0,
                upgrades: { paddleLength: 0, paddleGrip: 0, coinBonus: 0, startingScore: 0, extraHeart: 0 }
            };
        }
    } catch (error) {
        console.error("Failed to load or parse data:", error);
        // Reset to defaults on error
        saveData = {
            totalCoins: 0,
            upgrades: { paddleLength: 0, paddleGrip: 0, coinBonus: 0, startingScore: 0, extraHeart: 0 }
        };
    }
    // Update the global coin variable just in case other parts rely on it (though they should use saveData.totalCoins)
    // totalCoins = saveData.totalCoins; 
}

// Delete Save Data (Now uses saveData object)
function deleteSaveData() {
    if (confirm("Are you sure you want to delete all saved data (reset coins and upgrades)? This cannot be undone.")) {
        localStorage.removeItem('pongSaveData');
        // Reset the in-memory object to defaults
        saveData = {
            totalCoins: 0,
            upgrades: { paddleLength: 0, paddleGrip: 0, coinBonus: 0, startingScore: 0, extraHeart: 0 }
        };
        console.log("Save data deleted.");
        updateUI(); // Update score/coin display
        // If the shop is open when deleting, refresh it
        const shopOverlay = document.getElementById('shop-screen-overlay');
        if (shopOverlay && shopOverlay.style.display !== 'none') {
            populateShop(); // Refresh shop display
        }
    }
}
// -----------------------------------------

// --- Shop Functions (Placeholders) ---
const shopOverlay = document.getElementById('shop-screen-overlay');
const shopCoinCount = document.getElementById('shop-coin-count');
const playAgainBtn = document.getElementById('play-again-btn');

function showShop() {
    console.log("Showing shop");
    populateShop(); // Update display before showing
    shopOverlay.style.display = 'flex';
    // Add listeners specific to the shop
    playAgainBtn.addEventListener('click', handlePlayAgain);
    // Add listeners for buy buttons (using event delegation)
    const upgradeGrid = document.querySelector('.upgrade-grid');
    if (upgradeGrid) { // Check if grid exists before adding listener
        upgradeGrid.addEventListener('click', handleBuyClick);
    } else {
        console.error("Upgrade grid (.upgrade-grid) not found!");
    }
}

function hideShop() {
    console.log("Hiding shop");
    shopOverlay.style.display = 'none';
    // Remove listeners specific to the shop to prevent memory leaks
    playAgainBtn.removeEventListener('click', handlePlayAgain);
    const upgradeGrid = document.querySelector('.upgrade-grid');
    if (upgradeGrid) { // Check if grid exists before removing listener
        upgradeGrid.removeEventListener('click', handleBuyClick);
    } 
}

function handlePlayAgain() {
    playSound(buttonClickSound);
    hideShop();
    initializeGame();
}

function handleBuyClick(event) {
    if (event.target.classList.contains('buy-btn')) {
        playSound(buttonClickSound); // Play sound on buy attempt
        const upgradeType = event.target.getAttribute('data-upgrade');
        buyUpgrade(upgradeType);
    }
}

function populateShop() {
    console.log("Populating shop data...");
    if (!saveData) return; // Should not happen if loaded correctly

    shopCoinCount.textContent = saveData.totalCoins;

    for (const type in saveData.upgrades) {
        const level = saveData.upgrades[type];
        const maxLevel = MAX_UPGRADE_LEVEL;
        const effectConfig = UPGRADE_EFFECTS[type];
        const effectValue = level * effectConfig.scale;
        const cost = getUpgradeCost(type, level);
        const canAfford = saveData.totalCoins >= cost;
        const isMaxLevel = level >= maxLevel;

        // Format effect value for display
        let displayEffectValue;
        if (type === 'paddleLength' || type === 'paddleGrip' || type === 'coinBonus') {
            displayEffectValue = (effectValue * 100).toFixed(0); // Convert decimal to percentage string
        } else {
            displayEffectValue = effectValue; // Use raw value for score/hearts
        }

        document.getElementById(`${getUpgradeIdPrefix(type)}-effect`).textContent = displayEffectValue;
        document.getElementById(`${getUpgradeIdPrefix(type)}-level`).textContent = `${level}/${maxLevel}`;
        document.getElementById(`${getUpgradeIdPrefix(type)}-cost`).textContent = isMaxLevel ? "MAX" : `${cost} Coins`;
        
        const buyButton = document.querySelector(`.buy-btn[data-upgrade="${type}"]`);
        if (buyButton) {
            buyButton.disabled = isMaxLevel || !canAfford;
            buyButton.textContent = isMaxLevel ? "Max Level" : "Buy";
        }
    }

    // ALSO UPDATE MAIN UI COIN COUNT (Fix for stale display)
    updateUI(); 
}

// Helper to get ID prefix (e.g., 'pl' from 'paddleLength')
function getUpgradeIdPrefix(type) {
    switch (type) {
        case 'paddleLength': return 'pl';
        case 'paddleGrip': return 'pg';
        case 'coinBonus': return 'cb';
        case 'startingScore': return 'ss';
        case 'extraHeart': return 'eh';
        default: return '';
    }
}

function getUpgradeCost(type, currentLevel) {
    if (currentLevel >= MAX_UPGRADE_LEVEL) return Infinity; // Max level reached
    const config = UPGRADE_COSTS[type];
    // Calculate cost using exponential growth (base * multiplier^level)
    return Math.floor(config.base * Math.pow(config.multiplier, currentLevel));
}

function buyUpgrade(type) {
    console.log(`Attempting to buy ${type}`);
    const currentLevel = saveData.upgrades[type];

    if (currentLevel >= MAX_UPGRADE_LEVEL) {
        console.log("Already at max level.");
        return;
    }

    const cost = getUpgradeCost(type, currentLevel);

    if (saveData.totalCoins >= cost) {
        saveData.totalCoins -= cost;
        saveData.upgrades[type]++;
        console.log(`Bought ${type}. New level: ${saveData.upgrades[type]}, Coins left: ${saveData.totalCoins}`);
        saveAllData(); // Save the changes
        populateShop(); // Refresh the shop display
    } else {
        console.log("Not enough coins.");
        // Optional: Add visual feedback for insufficient funds
    }
}
// -------------------------------------

// --- Game Start Function ---
function startGame() {
    console.log('startGame called');
    if (gameRunning) {
         console.log("Game already running, preventing double start.");
         return; // Prevent multiple starts
    }

    // We assume initializeGame has already set up the initial state

    gameRunning = true;
    gameOverMessage = ""; // Clear any previous game over message
    startOverlay.style.display = 'none'; // Hide start screen

    // Ensure ball exists and is positioned correctly (resetBalls in initializeGame handles this)
    // if (balls.length === 0) {
    //     resetBalls();
    // }

    // Start the core game mechanisms
    startPowerupSpawner(); // Start spawning powerups

    // Start the game loop ONLY if it's not already running
    if (!currentGameLoopId) {
        console.log("startGame: Initializing and starting loop...");
        console.log("Requesting animation frame...");
        currentGameLoopId = requestAnimationFrame(gameLoop);
    } else {
        console.log("Game loop already requested? ID:", currentGameLoopId);
    }

    initAudioContext(); // Ensure context is active
    playBGM(); // Ensure BGM plays if starting from scratch (if loaded)
}

// --- Game Mechanics Toggle --- ADDED
document.addEventListener('DOMContentLoaded', () => { // Ensure elements exist before adding listener
    const toggle = document.getElementById('instruction-toggle');
    const content = document.getElementById('instruction-content');

    if (toggle && content) {
        toggle.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            toggle.textContent = isHidden ? 'Game Mechanics ▲' : 'Game Mechanics ▼';
        });
    } else {
        console.error("Instruction toggle or content element not found!");
    }
});
// -----------------------------

// Initialize the game when the script loads
initializeGame(); 

// Reset ball state (handles scoring or neutral reset)
function resetBall(scoredSide, centerReset = false) { // Added centerReset parameter
    // If only one ball exists after scoring, create a new one
    // Find the index of the ball that scored (often the only one left)
    // This logic might need review if multi-ball causes issues here
    let ball = balls[0]; // Assume the first ball is the one to reset if called after score
    if (!ball) { // If no balls exist (e.g., multi-ball cleared), create one
        ball = createBall();
        balls.push(ball);
    } else {
        // If multiple balls exist, maybe target the one that went out? Difficult to track.
        // Safest is usually to reset the first ball in the array after a score.
    }

    // Determine if the new ball is red
    ball.isRed = Math.random() < redBallChance;

    if (centerReset) {
        // --- Center Reset Logic (after red ball miss) ---
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * baseBallSpeed; // Random horizontal direction
        ball.dy = (Math.random() - 0.5) * baseBallSpeed * 0.5; // Small random vertical angle
        console.log("Red ball missed, resetting to center.");
    } else {
        // --- Standard Reset Logic (after score) ---
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        // Direction towards the player who just lost the point
        ball.dx = (scoredSide === 'ai' ? -1 : 1) * baseBallSpeed;
        ball.dy = (Math.random() - 0.5) * baseBallSpeed * 0.5; // Small random vertical angle
    }

    // Reset speed boost effect if active on this ball
    ball.speedMultiplier = 1; 

}

// --- Ball Update Logic ---
function updateBalls() {
    balls.forEach((ball, index) => {
        // Move ball
        ball.x += ball.dx * ball.speedMultiplier;
        ball.y += ball.dy * ball.speedMultiplier;

        // Collision with top/bottom walls
        if (ball.y < 0 || ball.y > canvas.height - ballSize) {
            ball.dy *= -1;
            playSound(wallHitSound);
        }

        // Collision with paddles
        let hitPaddle = null; // Track which paddle was hit

        // Check player paddle collision
        if (ball.dx < 0 && ball.x < player.x + player.width + ballSize && ball.x > player.x) { // More robust check
            if (collidesWithPaddle(ball, player)) {
                hitPaddle = 'player';
                if (ball.isRed) {
                    // --- Red Ball Hit Penalty (Player) ---
                    playerScore = Math.max(0, playerScore - 1);
                    playSound(redBallPenaltySound);
                    ball.isRed = false; // Turn ball white
                    console.log("Player hit red ball! Score -1");
                    updateUI(); // Update score immediately
                } else {
                    // --- Normal Hit Sound ---
                    playSound(paddleHitSound);
                }

                // Bounce logic (applies to both red and white after penalty check)
                let collidePoint = ball.y - (player.y + player.height / 2);
                collidePoint = collidePoint / (player.height / 2);
                let angleRad = collidePoint * (Math.PI / 4); // Max 45 degrees

                // Apply grip modifier
                const gripLevel = saveData.upgrades.paddleGrip;
                const gripEffect = UPGRADE_EFFECTS.paddleGrip.scale;
                const gripModifier = 1.0 - (gripLevel * gripEffect);
                angleRad *= gripModifier;

                let speed = Math.sqrt(ball.dx**2 + ball.dy**2);
                ball.dx = speed * Math.cos(angleRad); // Positive direction after player hit
                ball.dy = speed * Math.sin(angleRad);
                increaseBallSpeed(ball); // Speed up slightly
            }
        }

        // Check AI paddle collision
        if (!hitPaddle && ball.dx > 0 && ball.x > ai.x - ballSize && ball.x < ai.x + ai.width) { // More robust check
             if (collidesWithPaddle(ball, ai)) {
                hitPaddle = 'ai';
                if (ball.isRed) {
                    // --- Red Ball Hit Penalty (AI) ---
                    aiScore = Math.max(0, aiScore - 1);
                    playSound(redBallPenaltySound);
                    ball.isRed = false; // Turn ball white
                    console.log("AI hit red ball! Score -1");
                    updateUI(); // Update score immediately
                } else {
                     // --- Normal Hit Sound ---
                    playSound(paddleHitSound);
                }

                // Bounce logic (AI doesn't have grip upgrade)
                 let collidePoint = ball.y - (ai.y + ai.height / 2);
                collidePoint = collidePoint / (ai.height / 2);
                let angleRad = collidePoint * (Math.PI / 4);

                let speed = Math.sqrt(ball.dx**2 + ball.dy**2);
                ball.dx = -speed * Math.cos(angleRad); // Negative direction after AI hit
                ball.dy = speed * Math.sin(angleRad);
                increaseBallSpeed(ball);
            }
        }


        // Ball out of bounds (Scoring or Red Ball Miss)
        if (ball.x < 0) {
            if (ball.isRed) {
                // --- Red Ball Missed by Player ---
                console.log("Player missed RED ball.");
                resetBall(null, true); // Neutral center reset
            } else {
                // --- AI Scores ---
                console.log("AI scored.");
                aiScore += isAiScoreDoubled ? 2 : 1; // Apply double score if active
                playerHearts--;
                playSound(scoreSound);
                if (playerHearts <= 0) {
                    win(`YOU LOSE! ${playerScore} - ${aiScore}`);
                    calculateCoinReward(false); // Player lost
                } else {
                    resetBall('player'); // Normal reset, ball goes to AI
                }
            }
            updateUI();
        } else if (ball.x > canvas.width) {
             if (ball.isRed) {
                // --- Red Ball Missed by AI ---
                 console.log("AI missed RED ball.");
                resetBall(null, true); // Neutral center reset
            } else {
                 // --- Player Scores ---
                console.log("Player scored.");
                playerScore += isPlayerScoreDoubled ? 2 : 1; // Apply double score if active
                aiHearts--;
                playSound(scoreSound);
                if (aiHearts <= 0) {
                    win(`YOU WIN! ${playerScore} - ${aiScore}`);
                     calculateCoinReward(true); // Player won
                } else {
                    resetBall('ai'); // Normal reset, ball goes to player
                }
            }
            updateUI();
        }

        // If a score happened and removed hearts, this ball instance might be invalid
        // A better approach might involve marking balls for removal and handling it outside the loop
        if (playerHearts <= 0 || aiHearts <= 0) {
             return; // Exit early if game ended due to score
        }
    });
}

// --- Power-up Collision & Effects ---
// ... existing powerup code ...

// ... rest of the file remains unchanged ... 