import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../'); 

const functionsDir = path.join(projectRoot, 'functions');
let services = [];
if (fs.existsSync(functionsDir)) {
    services = fs.readdirSync(functionsDir).filter(file => {
        try {
            return fs.statSync(path.join(functionsDir, file)).isDirectory();
        } catch (e) { return false; }
    });
}

async function main() {
    console.log(chalk.blue.bold('\n🧪 Monorepo Test Runner (Windows Safe)\n'));

    const { scope } = await inquirer.prompt([{
        type: 'list',
        name: 'scope',
        message: 'Which service?',
        choices: [
            { name: '🌎 All Services', value: 'ALL' },
            new inquirer.Separator(),
            ...services.map(s => ({ name: `📦 ${s}`, value: s }))
        ]
    }]);

    const { testType } = await inquirer.prompt([{
        type: 'list',
        name: 'testType',
        message: 'What scope?',
        choices: [
            { name: '⚡ Unit Tests', value: 'unit' },
            { name: '🐢 Integration Tests', value: 'integration' },
            { name: '🚀 Everything', value: 'all' },
            new inquirer.Separator(),
            { name: '🎯 Specific File (Pattern without entering.test.ts)', value: 'file' }
        ]
    }]);

    let cmd = '';
    const jestBin = 'npx jest'; 

    // Convert Windows backslashes to Forward Slashes for Regex
    const toJestPattern = (p) => p.replace(/\\/g, '/');

    if (testType === 'file') {
        const { pattern } = await inquirer.prompt([{
            type: 'input',
            name: 'pattern',
            message: 'Filename pattern:',
            validate: i => i.length > 0 ? true : 'Required'
        }]);

        if (scope === 'ALL') {
            cmd = `${jestBin} functions -t "${pattern}"`;
        } else {
            // Path to config (System Path is fine here)
            const configPath = path.join('functions', scope, 'jest.config.js');
            // Search Pattern (Must be Forward Slash)
            const searchPattern = toJestPattern(`functions/${scope}`);
            
            cmd = `${jestBin} -c "${configPath}" "${searchPattern}" -t "${pattern}"`;
        }

    } else {
        const subFolder = testType === 'all' ? '' : testType;
        
        if (scope === 'ALL') {
             // Pattern: functions/*/tests/unit
             const searchPattern = toJestPattern(`functions/*/tests/${subFolder}`);
             cmd = `${jestBin} "${searchPattern}"`;
        } else {
            const configPath = path.join('functions', scope, 'jest.config.js');
            
            // "functions/price-fetcher/tests/unit"
            const searchPattern = toJestPattern(`functions/${scope}/tests/${subFolder}`);
            
            console.log(chalk.cyan(`\nRunning ${testType} for ${scope}...`));
            cmd = `${jestBin} -c "${configPath}" "${searchPattern}"`;
        }
    }

    console.log(chalk.dim(`> ${cmd}`));
    shell.exec(cmd); 
}

main();