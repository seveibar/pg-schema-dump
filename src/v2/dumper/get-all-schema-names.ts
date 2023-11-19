import { DumperContext } from "./dumper-context"
import { uniq } from "lodash"

export const getAllSchemaNames = async (ctx: DumperContext) => {
  const query = "SELECT schema_name FROM information_schema.schemata;"
  const result = await ctx.client.query(query)
  return uniq(result.rows.map((row) => row.schema_name) as string[])
}
