# Alien Infection Game

A browser-based sci-fi logic puzzle where you identify infected
crew members by analyzing their statements.

Some crew members tell the truth, while others lie. Use the mission
briefing and logical deduction to uncover the infection and save the ship.

## Play Online

[Play Alien Infection Game](https://wutthapanyas.github.io/Alien-Infection-Game/)

## How to Play

1. Read the mission briefing, which shows the number of crew members,
   infected members, truthful members, and liars.
2. Carefully read each crew member's statement.
3. Click a crew member's CLEAR button to mark them as INFECTED.
   Click again to remove the selection.
4. Select exactly the number of infected members shown in the briefing.
5. Click SUBMIT REPORT to check your answer.
6. Click NEW MISSION to generate another puzzle.

Correctly identify every infected crew member to complete the mission.
An incorrect report ends the mission and reveals the solution.

## Important Rules

- Truthful crew members make true statements.
- Liars make false statements.
- Infection and truthfulness are independent:
  an infected crew member can tell the truth,
  and an uninfected crew member can lie.
- Statements may describe infection, truthfulness,
  or relationships between multiple crew members.

## Features

- Procedurally generated puzzles with 4–7 crew members.
- Randomized infection and truthfulness assignments.
- A variety of logical statement templates.
- A validator that checks each puzzle for a unique solution.
- Solution reveal showing infection and truthfulness.
- Sci-fi interface with a canvas star-field background.

## How Puzzle Generation Works

1. Generate a crew and assign infection and truthfulness.
2. Give each crew member a statement consistent with their role.
3. Check possible assignments against the statements and briefing.
4. Accept the puzzle only when exactly one valid solution exists.

## Technologies Used

- HTML — page structure
- CSS — styling and layout
- JavaScript — puzzle generation, validation, and interaction
- Canvas API — star-field background
- GitHub Pages — hosting

## Run Locally

Download or clone this repository, then open index.html
in your web browser.

No build step or backend server is required.

## Project Files

- index.html — main page and game interface
- style.css — visual styles
- script.js — puzzle logic, validation, and interface behavior
- manifest.json — web app metadata

## Author

Maintained by [WutthapanyaS](https://github.com/WutthapanyaS).
