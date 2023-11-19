import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getFunctionsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.PgFunction[]> => {
  // Query to fetch function details from the database for the given schema
  const query = `
    SELECT 
      p.proname as function_name, 
      pg_catalog.pg_get_userbyid(p.proowner) as owner,
      pg_catalog.pg_get_functiondef(p.oid) as function_definition
    FROM 
      pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE 
      n.nspname = $1
  `

  // Execute the query and get the results
  const result = await ctx.client.query(query, [schemaname])

  // Map the result to the OutType.PgFunction format
  return result.rows.map((row) => ({
    name: row.function_name,
    owner: row.owner,
    query: row.function_definition,
  }))
}
