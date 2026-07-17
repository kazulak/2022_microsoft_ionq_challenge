# Quantum Tetris

Developed for MIT IQUHACK 2022 

Presented by QuanTris: `Caspian Chaharom, Danai Bili, Frederik Hardervig, Sneha Shakya, Tomasz Kazulak`

---

## 🤖 Repository Maintenance & Structure (Agentic AI)

This repository is maintained and modernized using **agentic AI (Antigravity)**. The project has been structured into the following Git branches:

1. **`submitted-version`**: The original, unmodified version of the game as submitted to MIT iQuHACK 2022.
2. **`runnable-minimal`**: The game with minimal modifications to make it run and not crash on modern environments (Python 3.10+ and pygame 2.x).
3. **`development`**: The branch dedicated to further local development, advanced features, and enhancements.
4. **`browser-game`**: The branch dedicated to adapting the game to run fully in the browser (client-side) for deployment to GitHub Pages.

---


## Game Rules and Goal

In this game your blocks are Qubits, and you must make them destructively interfere to get rid of them.
There are two types of blocks:
* Single qubit blocks:
  * The arrows represent the quantum state of the qubit. The `|0>` basis is the x-axis and teh `|1>` basis vector is the y-axis. So a Hadamard gate applied to `|0>` would make `1/√2 (|0>+|1>)` which would be an arrow pointing in the up-right direction 
  * You can apply the pauli `x` and `z` gates and Hadamard `h` gate by clicking the buttons or pressing the keys on the keyboard
  * The goal of the game is to have the blocks disappear using destructive interference
* Two qubit blocks:
  * Some blocks have two qubits. The single qubit gates operate on the first qubit
  * There are also two two-qubit gates, the controlled x `CX` and controlled z `CZ`, which you can apply by clicking the buttons on the screen, or pressing the keys `a` and `s`, which are directly above their single qubit counterparts on the keyboard

## How to run

Run `python Amalgamation.py` after installing the dependencies `numpy` and `pygame`

## GitHub Repo: https://github.com/CaspianChaharom/Quantum-Tetris


## Pictures
Mapping to qubit states to arrow direction:
![](Pictures/Clock.png)
Screenshot of game during play
![](Pictures/Game.png)


## MIT IQUHACK 2022: Our team's experience

After a hectic couple of days of meetings and lots of hacking, we will remember MIT IQUHACK 2022 for the invaluable experience of getting to run Quantum simulations, but also the fantastic opportunity of getting to know so many passionate hackers and scientists. Overall, despite this being the first hackathon for some of us, we were still able to envision, create (and debug) a full project from scratch, which served as an incredible introduction into the field. Of course, this wouldn't have been possible without the tremendous support of the whole community! 
