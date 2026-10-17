import { promises as fs } from "node:fs";
export default async function setup() {
  await fs.rm(".data/e2e.json", { force: true });
}
