import test from "ava"
import fs from "fs"
import os from "os"
import child_process from "child_process"
import path from "path"
import { getTestPostgresDatabaseFactory } from "ava-postgres"
import { Client } from "pg"

export const initialVfs = {
  "package.json": JSON.stringify({
    name: "some-package",
  }),
}

const execSync = (...args: Parameters<typeof child_process.execSync>) => {
  try {
    console.log(`> ${args[0]}`)
    return child_process.execSync(...args)
  } catch (err: any) {
    throw new Error(err.message)
  }
}

let testDir: string

test.beforeEach(() => {
  // create a temporary directory representing the filesystem
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"))

  // create the files from the filesystem config
  for (const [filepath, contents] of Object.entries(initialVfs)) {
    const fullPath = path.join(testDir, filepath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, contents)
  }
})

test.afterEach(() => {
  // clean up the test directory
  fs.rm(testDir, { recursive: true }, () => {})
})

const getTestDatabase = getTestPostgresDatabaseFactory({
  postgresVersion: "14",
})

test("use seam-pgm in a normal way", async (t) => {
  const { pool, connectionString } = await getTestDatabase()
})
