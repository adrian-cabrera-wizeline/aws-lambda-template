import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../');

// Helper: Fix slashes for Windows (Jest requires forward slashes for patterns)
const toJestPattern = (p) => p.replace(/\\/g, '/');

async function main() {
    console.log(chalk.blue.bold('\n🧪 Monorepo Test Runner (Co-location Support)\n'));

    // 1. Detect Services
    const functionsDir = path.join(projectRoot, 'functions');
    let services = [];
    if (fs.existsSync(functionsDir)) {
        services = fs.readdirSync(functionsDir).filter(f => 
            fs.statSync(path.join(functionsDir, f)).isDirectory()
        );
    }

    // 2. Detect Common (Fix: Use commonDir to conditionally add it)
    const commonDir = path.join(projectRoot, 'common');
    const hasCommon = fs.existsSync(commonDir);

    // Build Menu Choices
    const choices = [
        { name: '🌎 All Services', value: 'ALL' },
        new inquirer.Separator()
    ];

    if (hasCommon) {
        choices.push({ name: '📚 Common Utils', value: 'common' });
        choices.push(new inquirer.Separator());
    }

    services.forEach(s => {
        choices.push({ name: '📦 ' + s, value: s });
    });

    const { scope } = await inquirer.prompt([{
        type: 'list',
        name: 'scope',
        message: 'Which scope?',
        choices: choices
    }]);

    const { testType } = await inquirer.prompt([{
        type: 'list',
        name: 'testType',
        message: 'What kind of tests?',
        choices: [
            { name: '⚡ Unit Tests (Co-located)', value: 'unit' },
            { name: '🐢 Integration Tests', value: 'integration' },
            { name: '🚀 Everything', value: 'all' }
        ]
    }]);

    const jestBin = 'npx jest';
    let cmd = '';
    let configPath = '';
    let searchPattern = '';

    // 3. Logic for "Common"
    if (scope === 'common') {
        configPath = path.join('common', 'jest.config.js');
        
        if (testType === 'unit') {
            // Look for tests inside these specific folders in common
            searchPattern = toJestPattern('common/(repositories|utils|middleware)'); 
        } else if (testType === 'integration') {
            searchPattern = toJestPattern('common/tests/integration');
        } else {
            searchPattern = toJestPattern('common');
        }
    } 
    // 4. Logic for "All"
    else if (scope === 'ALL') {
        cmd = `${jestBin} --passWithNoTests`; 
    } 
    // 5. Logic for Specific Lambda
    else {
        configPath = path.join('functions', scope, 'jest.config.js');
        const servicePath = `functions/${scope}`;

        if (testType === 'unit') {
            // Look for tests in src (co-located) OR legacy tests/unit
            searchPattern = toJestPattern(`${servicePath}/(src|tests/unit)`);
        } else if (testType === 'integration') {
            searchPattern = toJestPattern(`${servicePath}/tests/integration`);
        } else {
            searchPattern = toJestPattern(servicePath);
        }
    }

    // 6. Build Command
    if (scope !== 'ALL') {
        // Fallback: Use root config if specific config is missing
        if (!fs.existsSync(path.join(projectRoot, configPath))) {
            console.log(chalk.yellow(`⚠️  Config ${configPath} not found, using default.`));
            cmd = `${jestBin} "${searchPattern}"`;
        } else {
            cmd = `${jestBin} -c "${configPath}" "${searchPattern}"`;
        }
    }

    console.log(chalk.dim(`> ${cmd}`));
    shell.exec(cmd);
}

main();