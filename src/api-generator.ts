#!/usr/bin/env node
import { Command } from "commander";
import { generatorApis, getApiDoc } from "./utils/index";

async function main() {
  const chalk = (await import("chalk")).default;
  const ora = (await import("ora")).default;
  const figlet = (await import("figlet")).default;
  const inquirer = (await import("inquirer")).default;

  const commander = new Command();
  console.log(
    chalk.green(
      figlet.textSync("apis", {
        font: "Ghost",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
 
  commander
    .version("1.0.0")
    // .usage("<template> <path>")
    // .arguments("<template> <path>")
    .option("-u, --url <url>", "swagger api-docs地址")
    // template: string, pathArg: string
    .action(async (options) => {
      let url: string;
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

      const info = await getApiDoc(url);
      const path = generatorApis(info as string);
      spinner.stop();

      console.log(chalk.green("生成位置：", path));
    });

  commander.parse(process.argv);
}

main();
