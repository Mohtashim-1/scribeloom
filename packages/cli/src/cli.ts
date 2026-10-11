import { add, list, report } from "./commands";

const HELP = `openedit: copy OpenEdit UI components into your project

Usage
  openedit list                     show the components you can add
  openedit add <name...> [options]  copy components and what they depend on

Options for add
  --dir <path>   where to put them (default: src/components/openedit)
  --overwrite    replace files that already exist
  --cwd <path>   project root (default: the current folder)

Example
  npx openedit add toolbar bubble-menu
`;

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return 0;
  }
  if (command === "list") {
    console.log(`Components:\n${list()}`);
    return 0;
  }
  if (command !== "add") {
    console.error(`Unknown command: ${command}\n\n${HELP}`);
    return 1;
  }

  const names: string[] = [];
  const options = { cwd: process.cwd(), dir: "src/components/openedit", overwrite: false };
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index]!;
    if (argument === "--overwrite") options.overwrite = true;
    else if (argument === "--dir" || argument === "--cwd") {
      const value = rest[++index];
      if (!value) {
        console.error(`${argument} needs a value.`);
        return 1;
      }
      options[argument === "--dir" ? "dir" : "cwd"] = value;
    } else if (argument.startsWith("-")) {
      console.error(`Unknown option: ${argument}`);
      return 1;
    } else names.push(argument);
  }
  if (!names.length) {
    console.error(
      `Say which component to add, for example: openedit add toolbar\n\nComponents:\n${list()}`,
    );
    return 1;
  }
  try {
    console.log(report(add(names, options), options.dir));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
