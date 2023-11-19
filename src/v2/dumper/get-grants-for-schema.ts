import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getGrantsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.Grant[]> => {
  // Query to fetch table-level grants in the schema
  const query = `
    SELECT grantee, privilege_type, table_name
    FROM information_schema.role_table_grants
    WHERE table_schema = $1;
  `

  // Execute the query and get the results
  const result = await ctx.client.query(query, [schemaname])

  // Map the result to the OutType.Grant format
  return result.rows.map((row) => {
    // Constructing the GRANT query
    const grantQuery = `GRANT ${row.privilege_type} ON TABLE ${schemaname}.${row.table_name} TO ${row.grantee};`

    return {
      query: grantQuery,
    }
  })
}
