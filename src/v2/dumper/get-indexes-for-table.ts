import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getIndexesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Index[]> => {
  // Query the database to get indexes for the given table
  const { rows } = await ctx.client.query(
    `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename = $2;
  `,
    [schemaname, tablename]
  )

  // Map the result to the OutType.Index format
  return rows.map((row) => ({
    name: row.indexname,
    query: row.indexdef,
  }))
}
