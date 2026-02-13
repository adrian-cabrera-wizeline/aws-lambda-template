import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

const forceForwardSlash = (p) => p.replace(/\\/g, '/');

async function main() {
    console.log(chalk.blue.bold('\n🧪 Monorepo Test Runner (Fixed)\n'));

    // --- STEP 1: DISCOVER PROJECTS ---
    const functionsDir = path.join(projectRoot, 'functions');
    const commonDir = path.join(projectRoot, 'common');
    
    let lambdas = [];
    if (fs.existsSync(functionsDir)) {
        lambdas = fs.readdirSync(functionsDir).filter(f => 
            fs.statSync(path.join(functionsDir, f)).isDirectory()
        );
    }

    const scopeChoices = [
        { name: '🌎 All Projects', value: 'ALL' },
        new inquirer.Separator()
    ];

    if (fs.existsSync(commonDir)) {
        scopeChoices.push({ name: '📚 Common (Shared Utils)', value: 'common' });
    }
    
    lambdas.forEach(name => {
        scopeChoices.push({ name: `📦 ${name}`, value: `functions/${name}` });
    });

    // --- STEP 2: INTERACTIVE MENU ---
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'scope',
            message: 'Where do you want to run tests?',
            choices: scopeChoices,
            pageSize: 12
        },
        {
            type: 'list',
            name: 'type',
            message: 'Which test scope?',
            choices: [
                { name: '⚡ Unit Tests', value: 'unit' },
                { name: '🐢 Integration Tests', value: 'integration' },
                { name: '🚀 Everything in this folder', value: 'recursive' }
            ],
            when: (ans) => ans.scope !== 'ALL'
        },
        {
            type: 'confirm',
            name: 'usePattern',
            message: 'Filter by filename pattern?',
            default: false
        },
        {
            type: 'input',
            name: 'pattern',
            message: 'Enter pattern (e.g. "audit" or "service"):',
            when: (ans) => ans.usePattern,
            validate: (input) => input ? true : 'Pattern cannot be empty'
        }
    ]);

    // --- STEP 3: CONSTRUCT COMMAND ---
    const jestBin = 'npx jest';
    let cmdArgs = [];
    let pathFilter = '';

    // A. Handle "All Projects"
    if (answers.scope === 'ALL') {
        // 🟢 FIX: Do NOT pass --passWithNoTests argument blindly.
        // The root jest.config.js will now handle the project discovery.
        // We just run 'npx jest' and let the 'projects' array do the work.
    } 
    // B. Handle Specific Project
    else {
        // 1. Point to the SPECIFIC config
        const targetConfig = path.join(projectRoot, answers.scope, 'jest.config.js');
        if (fs.existsSync(targetConfig)) {
            cmdArgs.push(`-c "${targetConfig}"`);
        }
        
        // 2. Set the base path
        pathFilter = answers.scope; 
    }

    // C. Handle Test Type
    if (answers.scope !== 'ALL') {
        if (answers.type === 'unit') {
            if (answers.scope === 'common') {
                // 🟢 FIX: Explicitly include 'repositories' and 'utils' for Common Unit tests
                pathFilter = path.join(pathFilter, '(src|repositories|utils|middleware|tests/unit)');
            } else {
                pathFilter = path.join(pathFilter, '(src|tests/unit)');
            }
        } 
        else if (answers.type === 'integration') {
            // 🟢 FIX: Ensure we target the 'tests/integration' folder
            pathFilter = path.join(pathFilter, 'tests/integration');
        } 
    }

    // D. Format Regex
    let finalRegex = '';
    if (pathFilter) {
        finalRegex = forceForwardSlash(pathFilter);
    }

    if (answers.usePattern && answers.pattern) {
        // Combine path and user pattern
        if (finalRegex) {
            finalRegex = `${finalRegex}.*${answers.pattern}`;
        } else {
            finalRegex = answers.pattern;
        }
    }

    if (finalRegex) {
        cmdArgs.push(`--testPathPattern="${finalRegex}"`);
    }

    // --- STEP 4: EXECUTE ---
    // Add --passWithNoTests to prevent failure if a folder is empty
    const finalCmd = `${jestBin} ${cmdArgs.join(' ')} --passWithNoTests --colors`;
    
    console.log(chalk.dim('\n> Regex:'), chalk.yellow(finalRegex || '(None)'));
    console.log(chalk.dim('> Cmd:  '), chalk.cyan(finalCmd));
    
    shell.exec(finalCmd);
}

main();