#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const { exec, execSync } = require('child_process');

async function initProject(projectName) {
  const projectPath = path.join(process.cwd(), projectName);
  const clientPath = path.join(projectPath, 'client');
  const logicPath = path.join(projectPath, 'logic');

  try {
    console.log('Setting up React Vite project in the client directory...');
    await fs.copy(path.join(__dirname, '../templates/client'), clientPath);

    console.log('Setting up Node server in the logic directory...');
    await fs.copy(path.join(__dirname, '../templates/logic'), logicPath);

    // Generate <projectName>.ts with the project-specific class name
    await createGameFile(logicPath, projectName);

    // Update index.ts with project-specific import
    await updateIndexFile(logicPath, projectName);

    // Update index.template.ts with project-specific details
    await updateTemplateIndex(logicPath, projectName);

    // Update package.json names
    await updatePackageJsonName(clientPath, projectName);
    await updatePackageJsonName(logicPath, projectName);

    console.log(`Project ${projectName} created successfully!`);
    console.log('Next steps:');
    console.log(`1. Navigate to the project directory: cd ${projectName}`);
    console.log('2. Install dependencies for both client and logic:');
    console.log('   cd client && npm install');
    console.log('   cd ../logic && npm install');
  } catch (error) {
    console.error('Error creating project:', error);
  }
}

async function createGameFile(logicPath, projectName) {
  const gameTemplatePath = path.join(logicPath, 'src', 'game.template.ts');
  const newGameFilePath = path.join(logicPath, 'src', `${projectName}.ts`);

  try {
    let gameFileContent = await fs.readFile(gameTemplatePath, 'utf8');
    gameFileContent = gameFileContent.replace(/{{projectName}}/g, projectName);

    await fs.writeFile(newGameFilePath, gameFileContent, 'utf8');
    await fs.remove(gameTemplatePath);

    console.log(`Created ${newGameFilePath} with class name ${projectName}`);
  } catch (error) {
    console.error(`Error creating ${projectName}.ts:`, error);
  }
}

async function updateIndexFile(logicPath, projectName) {
  const indexTemplatePath = path.join(logicPath, 'src', 'index.template.ts');
  const indexFilePath = path.join(logicPath, 'src', 'index.ts');

  try {
    // Read the content of index.template.ts
    let indexFileContent = await fs.readFile(indexTemplatePath, 'utf8');

    // Replace {{projectName}} with the actual project name
    indexFileContent = indexFileContent.replace(/{{projectName}}/g, projectName);

    // Write the updated content to index.ts
    await fs.writeFile(indexFilePath, indexFileContent, 'utf8');
    await fs.remove(indexTemplatePath); // Remove the template file

    console.log(`index.ts created with project-specific import for ${projectName}`);
  } catch (error) {
    console.error('Error updating index.ts:', error);
  }
}


async function updateTemplateIndex(logicPath, projectName) {
  const templateIndexPath = path.join(logicPath, 'src', 'index.template.ts');
  const destIndexPath = path.join(logicPath, 'src', 'index.ts');

  try {
    if (fs.existsSync(templateIndexPath)) {
      let indexContent = await fs.readFile(templateIndexPath, 'utf8');
      indexContent = indexContent.replace('{{projectName}}', projectName);

      await fs.writeFile(destIndexPath, indexContent, 'utf8');
      console.log(`index.template.ts updated with dynamic project name ${projectName}`);
      await fs.remove(templateIndexPath); // Clean up if necessary
    } else {
      console.log(`File ${templateIndexPath} does not exist. Skipping update.`);
    }
  } catch (error) {
    console.error('Error updating index.template.ts:', error);
  }
}


async function updatePackageJsonName(directoryPath, projectName) {
  const packageJsonPath = path.join(directoryPath, 'package.json');

  try {
    const packageData = await fs.readJson(packageJsonPath);
    packageData.name = projectName;
    await fs.writeJson(packageJsonPath, packageData, { spaces: 2 });
    console.log(`Updated package.json name in ${directoryPath} to "${projectName}"`);
  } catch (error) {
    console.error(`Error updating package.json in ${directoryPath}:`, error);
  }
}

function runCommand(command) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    } else if (stderr) {
      console.error(`stderr: ${stderr}`);
    } else {
      console.log(stdout);
    }
  });
}

function runCommandSync(command) {
  try {
    const output = execSync(command, { stdio: 'pipe' });
    if (output) {
      console.log(output.toString());
    } else {
      console.log("No output from the command.");
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
const packageJsonPath = path.resolve(__dirname, '../package.json');
let version = '1.0.0';

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version || '1.0.0';
} catch (error) {
  console.error('Error reading package.json:', error);
}

function main() {
  const [,, command, projectName] = process.argv;

  if (command === 'init' && projectName) {
    initProject(projectName);
  } else if (command === '--version') {
    console.log(`Saasuke Version: ${version}`);
  } else if (command === 'compile') {
    console.log('Running convert...');
    runCommand('npm run start');
  } else if (command === 'build') {
    console.log('Running build...');
    runCommand('npm run build');
  } else if (command === 'deploy') {
    console.log('Running deploy...');
    runCommandSync('npm run deploy');
  } else {
    console.log('Usage: saasuke init <project-name>');
  }
}

main();
