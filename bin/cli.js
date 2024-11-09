#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

async function initProject(projectName) {
  const projectPath = path.join(process.cwd(), projectName);
  const clientPath = path.join(projectPath, 'client');
  const logicPath = path.join(projectPath, 'logic');

  try {
    // Copy the client template (full Vite setup)
    console.log('Setting up React Vite project in the client directory...');
    await fs.copy(path.join(__dirname, '../templates/client'), clientPath);

    // Copy the logic template (Express server)
    console.log('Setting up Node server in the logic directory...');
    await fs.copy(path.join(__dirname, '../templates/logic'), logicPath);

    // Update package.json name fields
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

// Function to update the package.json 'name' field
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

function main() {
  const [,, command, projectName] = process.argv;

  if (command === 'init' && projectName) {
    initProject(projectName);
  } else {
    console.log('Usage: saasuke init <project-name>');
  }
}

main();
