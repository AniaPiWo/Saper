import { Cell } from "./Cell.js";
import { UI } from "./UI.js";
import { Counter } from "./Counter.js";
import { Timer } from "./Timer.js";
import { ResetButton } from "./ResetButton.js";
import { Modal } from "./Modal.js";

class Game extends UI {
  #config = {
    easy: {
      rows: 8,
      cols: 8,
      mines: 10,
    },
    normal: {
      rows: 16,
      cols: 16,
      mines: 40,
    },
    expert: {
      rows: 30,
      cols: 16,
      mines: 99,
    },
  };

  #timer = new Timer();
  #counter = new Counter();
  #modal = new Modal();
  #isGameFinished = false;
  #numberOfRowes = null;
  #numberOfCols = null;
  #numberOfMines = null;
  #cells = [];
  #cellsElements = null;
  #cellsToReveal = 0;
  #revealedCells = 0;
  #board = null;
  #buttons = {
    modal: null,
    easy: null,
    normal: null,
    expert: null,
    reset: new ResetButton(),
  };

  initializeGame() {
    this.#handleElements();
    this.#counter.init();
    this.#timer.init();
    this.#addButtonsEventListeners();
    this.#newGame();
  }

  #newGame(
    rows = this.#config.easy.rows,
    cols = this.#config.easy.cols,
    mines = this.#config.easy.mines
  ) {
    this.#numberOfMines = mines;
    this.#numberOfCols = cols;
    this.#numberOfRowes = rows;
    this.#counter.setValue(this.#numberOfMines);
    this.#timer.resetTimer();
    this.#cellsToReveal =
      this.#numberOfCols * this.#numberOfRowes - this.#numberOfMines;
    this.#setStyles();
    this.#generateCells();
    this.#renderBoard();
    this.#placeMinesInCells();
    this.#cellsElements = this.getElements(this.UiSelectors.cell);
    this.#buttons.reset.changeEmotion("neutral");
    this.#isGameFinished = false;
    this.#revealedCells = 0;
    this.#addCellsEventListeners();
  }

  #endGame(isWin) {
    this.#isGameFinished = true;
    this.#timer.stopTimer();
    this.#modal.buttonText = "Close";

    if (!isWin) {
      this.#revealMines();
      this.#modal.infoText = "You lost, try again!";
      this.#buttons.reset.changeEmotion("negative");
      this.#modal.setText();
      this.#modal.toggleModal();
      return;
    }
    this.#modal.infoText =
      this.#timer.numberOfSeconds < this.#timer.maxNumberOfSeconds
        ? `You won, it took you ${
            this.#timer.numberOfSeconds
          } second, congratulations!`
        : "You won, congratulations!";
    this.#buttons.reset.changeEmotion("positive");
    this.#modal.setText();
    this.#modal.toggleModal();
  }

  #handleElements() {
    this.#board = this.getElement(this.UiSelectors.board);
    this.#buttons.modal = this.getElement(this.UiSelectors.modalButton);
    this.#buttons.easy = this.getElement(this.UiSelectors.easyButton);
    this.#buttons.normal = this.getElement(this.UiSelectors.normalButton);
    this.#buttons.expert = this.getElement(this.UiSelectors.expertButton);
  }

  #generateCells() {
    this.#cells.length = 0;
    for (let row = 0; row < this.#numberOfRowes; row++) {
      this.#cells[row] = [];
      for (let col = 0; col < this.#numberOfCols; col++) {
        this.#cells[row].push(new Cell(col, row));
      }
    }
  }

  #addCellsEventListeners() {
    this.#cellsElements.forEach((element) => {
      element.addEventListener("click", this.#handleCellClick);
      element.addEventListener("contextmenu", this.#handleCellContextMenu);
    });
  }

  #removeCellsEventListeners() {
    this.#cellsElements.forEach((element) => {
      element.removeEventListener("click", this.#handleCellClick);
      element.removeEventListener("contextmenu", this.#handleCellContextMenu);
    });
  }

  #addButtonsEventListeners() {
    this.#buttons.modal.addEventListener("click", () =>
      this.#modal.toggleModal()
    );
    this.#buttons.easy.addEventListener("click", () =>
      this.#handleNewGameClick(
        this.#config.easy.rows,
        this.#config.easy.cols,
        this.#config.easy.mines
      )
    );
    this.#buttons.normal.addEventListener("click", () =>
      this.#handleNewGameClick(
        this.#config.normal.rows,
        this.#config.normal.cols,
        this.#config.normal.mines
      )
    );
    this.#buttons.expert.addEventListener("click", () =>
      this.#handleNewGameClick(
        this.#config.expert.rows,
        this.#config.expert.cols,
        this.#config.expert.mines
      )
    );
    this.#buttons.reset.element.addEventListener("click", () =>
      this.#handleNewGameClick()
    );
  }

  #handleNewGameClick(
    rows = this.#numberOfRowes,
    cols = this.#numberOfCols,
    mines = this.#numberOfMines
  ) {
    this.#removeCellsEventListeners();
    this.#newGame(rows, cols, mines);
  }

  #renderBoard() {
    while (this.#board.firstChild) {
      this.#board.removeChild(this.#board.lastChild);
    }
    this.#cells.flat().forEach((cell) => {
      this.#board.insertAdjacentHTML("beforeend", cell.createElement());
      cell.element = cell.getElement(cell.selector);
    });
  }

  #placeMinesInCells() {
    let minesToPlace = this.#numberOfMines;

    while (minesToPlace) {
      const rowIndex = this.#getRandomInteger(0, this.#numberOfRowes - 1);
      const colIndex = this.#getRandomInteger(0, this.#numberOfCols - 1);
      const cell = this.#cells[rowIndex][colIndex];
      const hasCellMine = cell.isMine;
      if (!hasCellMine) {
        cell.addMine();
        minesToPlace--;
      }
    }
  }

  #getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  #clickCell(cell) {
    if (this.#isGameFinished || cell.isFlagged) return;
    if (cell.isMine) {
      this.#endGame(false);
    }
    this.#setCellValue(cell);
    if (this.#revealedCells === this.#cellsToReveal && !this.#isGameFinished) {
      this.#endGame(true);
    }
  }

  #revealMines() {
    this.#cells
      .flat()
      .filter(({ isMine }) => isMine)
      .forEach((cell) => cell.revealCell());
  }

  #setCellValue(cell) {
    let minesCount = 0;
    const { x, y } = cell;

    for (
      let row = Math.max(y - 1, 0);
      row <= Math.min(y + 1, this.#numberOfRowes - 1);
      row++
    ) {
      for (
        let col = Math.max(x - 1, 0);
        col <= Math.min(x + 1, this.#numberOfCols - 1);
        col++
      ) {
        if (this.#cells[row][col].isMine) {
          minesCount++;
        }
      }
    }

    cell.value = minesCount;
    cell.revealCell();
    this.#revealedCells++;

    if (!cell.value) {
      for (
        let row = Math.max(y - 1, 0);
        row <= Math.min(y + 1, this.#numberOfRowes - 1);
        row++
      ) {
        for (
          let col = Math.max(x - 1, 0);
          col <= Math.min(x + 1, this.#numberOfCols - 1);
          col++
        ) {
          const adjacentCell = this.#cells[row][col];
          if (!adjacentCell.isReveal) {
            this.#clickCell(adjacentCell);
          }
        }
      }
    }
  }

  #setStyles() {
    document.documentElement.style.setProperty(
      "--cells-in-row",
      this.#numberOfCols
    );
  }

  #handleCellClick = (e) => {
    const target = e.target;
    const rowIndex = parseInt(target.getAttribute("data-y", 10));
    const colIndex = parseInt(target.getAttribute("data-x", 10));
    const cell = this.#cells[rowIndex][colIndex];
    this.#clickCell(cell);
  };

  #handleCellContextMenu = (e) => {
    e.preventDefault();
    const target = e.target;
    const rowIndex = parseInt(target.getAttribute("data-y"), 10);
    const colIndex = parseInt(target.getAttribute("data-x"), 10);
    const cell = this.#cells[rowIndex][colIndex];
    if (cell.isReveal || this.#isGameFinished) return;
    if (cell.isFlagged) {
      this.#counter.increment();
      cell.toggleFlag();
      return;
    }
    if (!!this.#counter.value) {
      this.#counter.decrement();
      cell.toggleFlag();
    }
  };
}

window.onload = function () {
  const game = new Game();
  game.initializeGame();
};
