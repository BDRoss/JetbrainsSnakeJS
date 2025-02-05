import { Component, HostListener, OnInit } from '@angular/core';

// Define the Position interface
interface Position {
  x: number;
  y: number;
  colorIndex?: number; // Optional: For rainbow effect on snake
  cascadeStartTick?: number; // Optional: For handling cascading effects
}

@Component({
  selector: 'app-snake-game',
  templateUrl: './snake-game.component.html',
  styleUrls: ['./snake-game.component.scss'],
})
export class SnakeGameComponent implements OnInit {
  gridSize = 20; // Size of the grid (20x20 by default)
  cellSize = 20; // Size of each cell (will be adjusted dynamically to fit viewport)
  snake: Position[] = [];
  food: Position = { x: 0, y: 0 };
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'RIGHT';
  gameInterval: any;
  colorUpdateInterval: any;
  gameOver = false;
  gameStarted = false;
  paused = false;
  score = 0;

  foodSound: HTMLAudioElement = new Audio('/assets/vine-boom.mp3');
  deathSound: HTMLAudioElement = new Audio('/assets/roblox-death-sound_1.mp3');
  badGuitarSound: HTMLAudioElement = new Audio('/assets/zapsplat_bad_guitar.mp3');

  // Rainbow color logic
  rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
  cascadeInProgress = false; // Tracks whether the rainbow effect is active
  currentTick = 0; // Used for cascading animations

  // Speed control
  baseSpeed = 150; // Starting speed in ms
  speedDecrement = 10; // Decrease speed by 10ms after each point
  minSpeed = 50; // Minimum speed in ms

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.adjustGridToFitViewport();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault(); // Prevent default scrolling when pressing space
      this.togglePause(); // Pause or unpause the game
      return;
    }

    if (this.gameOver || !this.gameStarted || this.paused) return; // Ignore input if paused or game over

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (this.direction !== 'DOWN') this.direction = 'UP';
        break;

      case 'ArrowDown':
      case 's':
      case 'S':
        if (this.direction !== 'UP') this.direction = 'DOWN';
        break;

      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (this.direction !== 'RIGHT') this.direction = 'LEFT';
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        if (this.direction !== 'LEFT') this.direction = 'RIGHT';
        break;
    }
  }

  ngOnInit() {
    // this.foodSound = new Audio('assets/vine-boom.mp3');
    this.foodSound.load();
    this.foodSound.volume = 0.5;
    this.deathSound.load();
    this.badGuitarSound.load();
    this.adjustGridToFitViewport(); // Ensure the grid fits on initial view
    this.resetGame();
  }

  resetGame() {
    this.snake = [{ x: 5, y: 5, colorIndex: undefined, cascadeStartTick: 0 }]; // Reset snake
    this.generateFood(); // Create food
    this.direction = 'RIGHT'; // Reset direction
    this.gameOver = false; // Reset states
    this.score = 0;

    clearInterval(this.gameInterval);
    clearInterval(this.colorUpdateInterval);
  }

  startGame() {
    this.gameStarted = true;
    this.paused = false;

    this.foodSound.load(); // Preload the sound file after interaction

    this.resetGame();
    this.startGameLoop();

    this.colorUpdateInterval = setInterval(() => this.updateSnakeColors(), 300);
  }

  togglePause() {
    this.paused = !this.paused;

    if (this.paused) {
      clearInterval(this.gameInterval);
      clearInterval(this.colorUpdateInterval);
    } else {
      this.startGameLoop();
      this.colorUpdateInterval = setInterval(() => this.updateSnakeColors(), 300);
    }
  }

  startGameLoop() {
    this.gameInterval = setInterval(() => this.gameLoop(), this.baseSpeed);
  }

  gameLoop() {
    if (this.paused) return;

    const newHead: Position = { ...this.snake[0], cascadeStartTick: 0 };

    switch (this.direction) {
      case 'UP':
        newHead.y--;
        break;
      case 'DOWN':
        newHead.y++;
        break;
      case 'LEFT':
        newHead.x--;
        break;
      case 'RIGHT':
        newHead.x++;
        break;
    }

    // Check for collisions
    if (
      newHead.x < 0 ||
      newHead.x >= this.gridSize ||
      newHead.y < 0 ||
      newHead.y >= this.gridSize ||
      this.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
    ) {
      this.triggerGameOver();
      return;
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.generateFood(); // Generate new food
      this.score++; // Increment score
      this.startRainbowCascade(); // Trigger rainbow effect
      this.increaseSpeed(); // Speed up the game
      this.playBlockSound(); // Play sound
    } else {
      this.snake.pop(); // Remove last segment
    }
  }

  playBlockSound() {
    if (this.foodSound) {
      this.foodSound.currentTime = 0; // Reset the sound to the beginning
      this.foodSound
        .play()
        .then(() => {
          console.log('Sound played successfully!');
        })
        .catch((error) => {
          console.warn('Failed to play sound:', error);
        });
    }
  }

  triggerGameOver() {
    this.gameOver = true;
    this.gameStarted = false;
    clearInterval(this.gameInterval);
    clearInterval(this.colorUpdateInterval);

    // Play the death sound first
    this.deathSound.currentTime = 0;
    this.deathSound
      .play()
      .then(() => {
        // After the death sound finishes, play the bad guitar sound
        this.deathSound.addEventListener('ended', () => {
          this.badGuitarSound.currentTime = 0;
          this.badGuitarSound.play().catch((error) => {
            console.error('Failed to play bad guitar sound:', error);
          });
        });
      })
      .catch((error) => {
        console.warn('Failed to play death sound:', error);
      });
  }

  generateFood() {
    /* Ensure food is not placed on the snake */
    do {
      this.food = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize),
      };
    } while (this.snake.some((segment) => segment.x === this.food.x && segment.y === this.food.y));
  }

  updateSnakeColors() {
    if (!this.cascadeInProgress) return;

    this.currentTick++;
    let allBackToGreen = true;

    this.snake.forEach((segment) => {
      if (this.currentTick >= (segment.cascadeStartTick || 0)) {
        if (segment.colorIndex === undefined) {
          segment.colorIndex = 0;
        } else {
          segment.colorIndex++;
          if (segment.colorIndex >= this.rainbowColors.length) {
            segment.colorIndex = undefined;
          } else {
            allBackToGreen = false;
          }
        }
      } else {
        allBackToGreen = false;
      }
    });

    if (allBackToGreen) this.cascadeInProgress = false;
  }

  startRainbowCascade() {
    this.cascadeInProgress = true;

    this.snake.forEach((segment, index) => {
      segment.cascadeStartTick = this.currentTick + index;
    });
    this.snake[0].colorIndex = 0;
  }

  increaseSpeed() {
    this.baseSpeed = Math.max(this.baseSpeed - this.speedDecrement, this.minSpeed);
    clearInterval(this.gameInterval);
    this.startGameLoop();
  }

  adjustGridToFitViewport() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate maximum possible cell size to fit viewport
    const maxWidth = Math.min(viewportWidth, viewportHeight - 100); // Account for score and button
    this.cellSize = Math.floor(maxWidth / this.gridSize);
    document.documentElement.style.setProperty('--cell-size', `${this.cellSize}px`);
  }

  getGrid(): number[] {
    return Array(this.gridSize * this.gridSize).fill(0);
  }

  getCellColor(index: number): string {
    const x = index % this.gridSize;
    const y = Math.floor(index / this.gridSize);

    const segment = this.snake.find((segment) => segment.x === x && segment.y === y);
    if (segment) {
      if (segment.colorIndex !== undefined) {
        return this.rainbowColors[segment.colorIndex];
      } else {
        return '#4CAF50'; // Default snake color
      }
    }

    if (this.food.x === x && this.food.y === y) {
      return 'red'; // Food color
    }

    return 'white'; // Default cell color
  }
}
