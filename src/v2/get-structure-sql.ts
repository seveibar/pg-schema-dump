import getSQLFromTree from "./get-sql-from-database-tree"

export const getStructureSQL = async (
  opts: { defaultDatabase?: string; schemas?: string[] } = {}
): Promise<string> => {
  const tree = await getDatabaseTreeUsingClient(opts)
  const sql = await getSQLFromTree()

  return sql
}
