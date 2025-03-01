import { TypeScriptToCairoConverter } from './converter';
import * as fs from 'fs';
import * as path from 'path';

// Step 1: Convert TypeScript file to Cairo
const tsFilePath = path.join('src', `{{projectName}}.ts`);
const cairoFilePath = path.join(__dirname, '..', 'contract', 'src', `{{projectName}}.cairo`);

try {
  // Read the TypeScript code from the dynamically named file
  const tsCode = fs.readFileSync(tsFilePath, 'utf8');

  // Convert to Cairo
  const converter = new TypeScriptToCairoConverter(tsCode);
  const cairoCode = converter.convert();

  // Print the result
  console.log('Generated Cairo Code:');
  console.log('-------------------');
  console.log(cairoCode);

  // Save the converted Cairo code to the specified path
  fs.writeFileSync(cairoFilePath, cairoCode);
  console.log(`Cairo code saved to: ${cairoFilePath}`);
} catch (error) {
  console.error(`Error reading or converting TypeScript file at ${tsFilePath}:`, error);
}

// Paths for lib and deploy files
const libTemplatePath = path.join(__dirname, '..', 'contract', 'src', 'lib.template.cairo');
const libFilePath = path.join(__dirname, '..', 'contract', 'src', 'lib.cairo');
const deployTemplate = path.join(__dirname, '..', 'scripts', 'deploy.template.ts');
const deployFilePath = path.join(__dirname, '..', 'scripts', 'deploy.ts');

// Check if lib.template.cairo exists
if (fs.existsSync(libTemplatePath)) {
  try {
    // Read the template files
    let libContent = fs.readFileSync(libTemplatePath, 'utf8');
    let deployContent = fs.readFileSync(deployTemplate, 'utf8');

    // Replace {{Caironame}} with the actual project name
    libContent = libContent.replace('{{Caironame}}', '{{projectName}}');
    deployContent = deployContent.replace('{{Caironame}}', '{{projectName}}');

    // Save the modified content
    fs.writeFileSync(libFilePath, libContent);
    fs.writeFileSync(deployFilePath, deployContent);
    console.log(`lib.cairo updated with module name: {{projectName}}`);

    // Remove template files
    fs.unlinkSync(libTemplatePath);
    fs.unlinkSync(deployTemplate);
    console.log('lib.template.cairo and deploy.template.ts have been removed.');
  } catch (error) {
    console.error(`Error updating lib.cairo or deploy.ts:`, error);
  }
} else {
  // If lib.template.cairo is missing, extract module name from lib.cairo
  function getCairoFileName() {
    if (!fs.existsSync(libFilePath)) {
      console.error(`Error: ${libFilePath} not found.`);
      process.exit(1);
    }

    const libContent = fs.readFileSync(libFilePath, 'utf8');
    const match = libContent.match(/mod\s+(\w+);/);

    if (match && match[1]) {
      return `${match[1]}.cairo`;
    } else {
      console.error("Error: Could not extract module name from lib.cairo");
      process.exit(1);
    }
  }

  // Get the Cairo file name dynamically
  const cairoFileName = getCairoFileName();
  const cairoFilePath = path.join(__dirname, '..', 'contract', 'src', cairoFileName);

  console.log(`Detected Cairo file: ${cairoFilePath}`);

  if (!fs.existsSync(cairoFilePath)) {
    console.error(`Error: Expected Cairo file ${cairoFilePath} not found.`);
    process.exit(1);
  }
}