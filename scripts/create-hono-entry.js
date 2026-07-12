import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const entryPath = resolve("dist/index.js");

const contents = `import "../src/server/server.js";
`;

await mkdir(dirname(entryPath), { recursive: true });
await writeFile(entryPath, contents, "utf8");

