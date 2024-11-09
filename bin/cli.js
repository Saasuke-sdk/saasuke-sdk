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
    
  

function main() {
  const [,, command, projectName] = process.argv;

  if (command === 'init' && projectName) {
    initProject(projectName);
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
