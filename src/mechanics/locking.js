// @ts-check

import { Game } from "../game.js";
import { Mechanics } from "./mechanics.js";

export class LockPiece {
    divLockTimer = document.getElementById("lockTimer");
    divLockCounter = document.getElementById("lockCounter");
    lockCount;

    /**
     * @param {Game} game
     * @param {Mechanics} mechanics
     */
    constructor(mechanics, game) {
        this.mechanics = mechanics;
        this.game = game;
    }

    incrementLock() {
        if (this.game.timeouts["lockdelay"] != 0) {
            this.mechanics.Locking.clearLockDelay(false);
            this.lockCount++;
            if (this.game.settings.game.maxLockMovements != 0 && this.game.settings.display.lockBar) {
                const amountToAdd = 100 / this.game.settings.game.maxLockMovements;
                this.divLockCounter.value += amountToAdd;
            }
        }
        if (this.game.movement.checkCollision(this.mechanics.board.getMinos("A"), "DOWN"))
            this.mechanics.Locking.scheduleLock();
    }

    scheduleLock() {
        const LockMoves =
            this.game.settings.game.maxLockMovements == 0
                ? 99999
                : this.game.settings.game.maxLockMovements;
        if (this.lockCount >= LockMoves) {
            this.mechanics.Locking.lockPiece();
            return;
        }
        if (this.game.settings.game.lockDelay == 0) {
            this.game.timeouts["lockdelay"] = -1;
            return;
        }
        this.game.timeouts["lockdelay"] = setTimeout(
            () => this.mechanics.Locking.lockPiece(),
            this.game.settings.game.lockDelay
        );
        this.game.timeouts["lockingTimer"] = setInterval(() => {
            const amountToAdd = 1000 / this.game.settings.game.lockDelay;
            if (this.game.settings.display.lockBar) this.divLockTimer.value += amountToAdd;
        }, 10);
    }

    lockPiece() {
        this.mechanics.board.getMinos("A").forEach(([x, y]) => {
            this.mechanics.board.rmValue([x, y], "A");
            this.mechanics.board.addValFront([x, y], "S");
        });
        this.game.endGame(
            this.mechanics.checkDeath(
                this.mechanics.board.getMinos("S"),
                this.mechanics.board.getMinos("NP")
            )
        );
        this.mechanics.Locking.clearLockDelay();
        clearInterval(this.game.timeouts["gravity"]);
        this.mechanics.clear.clearLines();
        this.mechanics.totalPieceCount++;
        this.game.hold.occured = false;
        this.mechanics.isTspin = false;
        this.mechanics.isMini = false;
        this.game.falling.moved = false;
        this.mechanics.spawnPiece(this.game.bag.randomiser());
        this.mechanics.startGravity();
        this.game.rendering.renderDanger();
    }

    clearLockDelay(clearCount = true) {
        clearInterval(this.game.timeouts["lockingTimer"]);
        this.game.utils.stopTimeout("lockdelay");
        this.divLockTimer.value = 0;
        if (!clearCount) return;
        this.divLockCounter.value = 0;
        this.lockCount = 0;
        if (this.game.settings.game.preserveARR) return;
        this.game.controls.resetMovements();
    }
}
