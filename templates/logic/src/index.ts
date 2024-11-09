import { TypeScriptToCairoConverter } from './converter';
import * as fs from 'fs';
import * as path from 'path';

// Read the TypeScript counter code
const tsCode = fs.readFileSync('src/game.ts', 'utf8');

// Convert to Cairo
const converter = new TypeScriptToCairoConverter(tsCode);
const cairoCode = converter.convert();

// Print the result
console.log('Generated Cairo Code:');
console.log('-------------------');
console.log(cairoCode);

// Define the correct path to save the Cairo file
const outputPath = path.join(__dirname, '..', 'contract', 'src', 'game.cairo');

// Save to the specified path
fs.writeFileSync(outputPath, cairoCode);

console.log(`Cairo code saved to: ${outputPath}`);