#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const { exec, execSync } = require('child_process');

let ora, chalk;

async function loadModules() {
  ora = (await import('ora')).default;
  chalk = (await import('chalk')).default;
}

const packageJsonPath = path.resolve(__dirname, '../package.json');
let version = '1.0.0';

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version || '1.0.0';
} catch (error) {
  console.error('Error reading package.json:', error);
}

async function initProject(projectName) {
  const spinner = ora(`Initializing project ${projectName}...`).start();
  const projectPath = path.join(process.cwd(), projectName);
  const clientPath = path.join(projectPath, "client");
  const logicPath = path.join(projectPath, "logic");

  try {
      spinner.text = "Setting up React Vite project in the client directory...";
      await fs.copy(path.join(__dirname, "../templates/client"), clientPath);

      spinner.text = "Setting up Node server in the logic directory...";
      await fs.copy(path.join(__dirname, "../templates/logic"), logicPath);

      spinner.text = "Finalizing project setup...";
      await createGameFile(logicPath, projectName);
      await updateIndexFile(logicPath, projectName);
      await updatePackageJsonName(clientPath, projectName);
      await updatePackageJsonName(logicPath, projectName);

      spinner.succeed(`Project ${chalk.green(projectName)} created successfully!`);
      console.log(chalk.blue("Next steps:"));
      console.log(chalk.green(`1. Navigate to the project directory: cd ${projectName}`));
      console.log(chalk.green("2. Install dependencies for both client and logic:"));
      console.log(chalk.green("   cd client && npm install"));
      console.log(chalk.green("   cd ../logic && npm install"));
  } catch (error) {
      spinner.fail(`Error creating project: ${error.message}`);
  }
}

async function createGameFile(logicPath, projectName) {
  const spinner = ora('Creating game file...').start();
  const gameTemplatePath = path.join(logicPath, 'src', 'game.template.ts');
  const newGameFilePath = path.join(logicPath, 'src', `${projectName}.ts`);

  try {
    let gameFileContent = await fs.readFile(gameTemplatePath, 'utf8');
    gameFileContent = gameFileContent.replace(/{{projectName}}/g, projectName);

    await fs.writeFile(newGameFilePath, gameFileContent, 'utf8');
    await fs.remove(gameTemplatePath);

    spinner.succeed(`Created ${chalk.green(newGameFilePath)} with class name ${projectName}`);
  } catch (error) {
    spinner.fail(`Error creating ${projectName}.ts: ${error}`);
  }
}

async function updateIndexFile(logicPath, projectName) {
  const indexTemplatePath = path.join(logicPath, 'src', 'index.template.ts');
  const indexFilePath = path.join(logicPath, 'src', 'index.ts');

  const spinner = ora('Updating index file...').start();
  try {
    let indexFileContent = await fs.readFile(indexTemplatePath, 'utf8');
    indexFileContent = indexFileContent.replace(/{{projectName}}/g, projectName);
    await fs.writeFile(indexFilePath, indexFileContent, 'utf8');
    await fs.remove(indexTemplatePath);
    spinner.succeed(`Updated index.ts with project-specific import for ${projectName}`);
  } catch (error) {
    spinner.fail(`Error updating index.ts: ${error}`);
  }
}

async function updatePackageJsonName(directoryPath, projectName) {
  const packageJsonPath = path.join(directoryPath, 'package.json');
  const spinner = ora(`Updating package.json in ${directoryPath}...`).start();

  try {
    const packageData = await fs.readJson(packageJsonPath);
    packageData.name = projectName;
    await fs.writeJson(packageJsonPath, packageData, { spaces: 2 });
    spinner.succeed(`Updated package.json name in ${chalk.green(directoryPath)} to "${projectName}"`);
  } catch (error) {
    spinner.fail(`Error updating package.json in ${directoryPath}: ${error}`);
  }
}

function runCommand(command, description) {
  const spinner = ora(description).start();
  exec(command, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`Error: ${error.message}`);
    } else if (stderr) {
      spinner.warn(`Warning: ${stderr}`);
    } else {
      spinner.succeed(stdout);
    }
  });
}

function runCommandSync(command, description, args = []) {
  const spinner = ora(description).start();
  try {
    const fullCommand = `${command} ${args.join(' ')}`;
    const output = execSync(fullCommand, { stdio: 'pipe' });
    spinner.succeed(output.toString());
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
  }
}

function showHelp() {
  console.log(chalk.blue('\nAvailable commands:\n'));
  console.log(chalk.green('  saasuke init <project-name>'), '    Initialize a new project with the specified name.');
  console.log(chalk.green('  saasuke --version'), '         Show the version of Saasuke.');
  console.log(chalk.green('  saasuke compile'), '           Run the compile process.');
  console.log(chalk.green('  saasuke build'), '             Build the project.');
  console.log(chalk.green('  saasuke deploy'), '            Deploy the project.');
  console.log('\n');
}

async function main() {
  await loadModules();  // Ensure chalk and ora are loaded
  const [,, command, projectName, ...args] = process.argv;

  if (command === 'init' && projectName) {
    initProject(projectName);
  } else if (command === '--version') {
    console.log(chalk.blue(`Saasuke Version: ${version}`));
  } else if (command === 'compile') {
    runCommand('npm run start', 'Running compile...');
  } else if (command === 'build') {
    runCommand('npm run build', 'Running build...');
  } else if (command === 'deploy') {
    runCommandSync('npm run deploy', 'Running deploy...', args);
  } else if (!command) {
    showHelp();
  } else {
    console.log(chalk.red(`Unknown command: ${command}\n`));
    showHelp();
  }
}

main();
