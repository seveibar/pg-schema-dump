import { writeDatabaseTreeToDirectory } from "./write-database-tree-to-directory"
import { getDatabaseTreeUsingClient } from "./get-database-tree-using-client"

export const dumpTree = async (opts: {
  schemas?: string[]
  targetDir: string
}) => {
  if (!opts.schemas) opts.schemas = ["public"]
  const tree = await getDatabaseTreeUsingClient({
    schemas: opts.schemas,
  })

  await writeDatabaseTreeToDirectory(tree, opts.targetDir)
}
