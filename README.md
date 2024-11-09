# Saasuke SDK

Welcome to the **Saasuke SDK**! This SDK simplifies blockchain game development on Starknet, providing everything you need to build, deploy, and scale interactive on-chain games. With TypeScript-to-Cairo conversion, reusable modules, and smart contract templates, developers can streamline their projects and focus on creating immersive gaming experiences.

## Features
- **TypeScript to Cairo Conversion**: Write game logic in TypeScript, auto-generate and deploy Cairo contracts.
- **Smart Contract Templates**: Pre-built smart contracts for faster development.
- **Scalable Physics Engine**: Implement game physics with features like collision detection and gravity.
- **Turn-Based Mechanics**: Simplify turn-based logic for multiplayer games.
- **AI NPC Behavior**: Templates for integrating AI-driven NPCs into your game.

## Project Structure

```plaintext
/my-game
├── client/                     # Frontend client for interacting with the game
├── example-vite-react-sdk/     # Example React setup using Vite
├── logic/                      # Core logic for the game
│   ├── contract/               # Smart contract files
│   ├── scripts/                # Automation and helper scripts
│   └── src/                    # Game logic files in TypeScript
├── example.env                 # Example environment configuration file
├── package.json                # Project dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```
# Getting Started

## Prerequisites
- **Node.js**: Install Node.js and npm from [nodejs.org](https://nodejs.org/)
- **Starknet Wallet**: Set up a wallet to deploy contracts on Starknet.

## Installation

1. **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd my-game
    ```

2. **Install the SDK globally via npm**:
    ```bash
    npm i -g saasuke
    ```

3. **Initialize the game project**:
    ```bash
    saasuke init game
    ```

4. **Set up environment variables**:
    - Copy `example.env` to `.env` and configure as needed.

## Running the Project
To start the project, run:
```bash
npm start
```
This command will start the development environment, allowing you to begin building and testing your game.

### Documentation
For detailed documentation, setup instructions, and examples, visit our [GitBook Documentation.](https://prashants-organization-7.gitbook.io/rise-of-realms)


