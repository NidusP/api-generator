#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const index_1 = require("./utils/index");
async function main() {
    const chalk = (await import("chalk")).default;
    const ora = (await import("ora")).default;
    const figlet = (await import("figlet")).default;
    const inquirer = (await import("inquirer")).default;
    const commander = new commander_1.Command();
    console.log(chalk.green(figlet.textSync("apis", {
        font: "Ghost",
        horizontalLayout: "default",
        verticalLayout: "default",
    })));
    commander
        .version("1.0.0")
        // .usage("<template> <path>")
        // .arguments("<template> <path>")
        .option("-u, --url <url>", "swagger api-docs地址")
        // template: string, pathArg: string
        .action(async (options) => {
        let url;
        url = options.url;
        if (!url) {
            const ans = await inquirer.prompt({
                name: "请输入swagger api-docs地址",
            });
            url = ans["请输入swagger api-docs地址"];
        }
        if (!url) {
            return;
        }
        const spinner = ora("✈正在生成文件...");
        spinner.start();
        const info = await (0, index_1.getApiDoc)(url);
        const path = (0, index_1.generatorApis)(info);
        spinner.stop();
        console.log(chalk.green("生成位置：", path));
    });
    commander.parse(process.argv);
}
main();
