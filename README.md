# Quantum Tetris

Developed for MIT IQUHACK 2022 

Presented by QuanTris: `Caspian Chaharom, Danai Bili, Frederik Hardervig, Sneha Shakya, Tomasz Kazulak`

---

## Versions

**▶ Play in the browser: https://kazulak.github.io/2022_microsoft_ionq_challenge/**

| What | Where |
|---|---|
| Version submitted to iQuHACK 2022 (frozen) | tag [`iquhack-2022-submission`](https://github.com/kazulak/2022_microsoft_ionq_challenge/tree/iquhack-2022-submission) (also branch `main`) |
| This version: the submission with minimal fixes so it runs on Python 3.10+ / pygame 2 without crashing | branch `runnable-minimal` |
| Browser game, deployed to GitHub Pages | branch `browser-game` |

The repository is maintained with the help of agentic AI (Antigravity, Claude Code). Everything after the hackathon happens on branches; the submission is never changed.

---


## Game Rules and Goal

In this game your blocks are Qubits, and you must make them destructively interfere to get rid of them.
There are two types of blocks:
* Single qubit blocks:
  * The arrows represent the quantum state of the qubit. The `|0>` basis is the x-axis and the `|1>` basis vector is the y-axis. So a Hadamard gate applied to `|0>` would make `1/√2 (|0>+|1>)` which would be an arrow pointing in the up-right direction 
  * You can apply the pauli `x` and `z` gates and Hadamard `h` gate by clicking the buttons or pressing the keys on the keyboard
  * The goal of the game is to have the blocks disappear using destructive interference
* Two qubit blocks:
  * Some blocks have two qubits. The single qubit gates operate on the first qubit
  * There are also two two-qubit gates, the controlled x `CX` and controlled z `CZ`, which you can apply by clicking the buttons on the screen, or pressing the keys `s` (CX) and `a` (CZ), which are directly above their single qubit counterparts on the keyboard

## How to run

Install the dependencies with `pip install -r requirements.txt`, then run `python Amalgamation.py`.

Controls: `x`, `z`, `h` single-qubit gates; `s` CX, `a` CZ; ← → move; hold ↓ to fall faster; Esc quits. The buttons and the difficulty `+`/`-` can also be clicked.

## GitHub Repo: https://github.com/CaspianChaharom/Quantum-Tetris


## Pictures
Mapping to qubit states to arrow direction:
![](Pictures/Clock.png)
Screenshot of game during play
![](Pictures/Game.png)


## MIT IQUHACK 2022: Our team's experience

After a hectic couple of days of meetings and lots of hacking, we will remember MIT IQUHACK 2022 for the invaluable experience of getting to run Quantum simulations, but also the fantastic opportunity of getting to know so many passionate hackers and scientists. Overall, despite this being the first hackathon for some of us, we were still able to envision, create (and debug) a full project from scratch, which served as an incredible introduction into the field. Of course, this wouldn't have been possible without the tremendous support of the whole community! 
