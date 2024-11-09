

import { TypeScriptToCairoConverter } from './converter';
import * as fs from 'fs';

// Read the TypeScript counter code
const tsCode = fs.readFileSync('src/counter.ts', 'utf8');

// Convert to Cairo
const converter = new TypeScriptToCairoConverter(tsCode);
const cairoCode = converter.convert();

// Print the result
console.log('Generated Cairo Code:');
console.log('-------------------');
console.log(cairoCode);

// Save to file
fs.writeFileSync('counter.cairo', cairoCode);