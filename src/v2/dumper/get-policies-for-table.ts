import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getPoliciesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Policy[]> => {
  // Use the client from the context to execute a query
  const { rows } = await ctx.client.query(
    `
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = $1 AND tablename = $2
  `,
    [schemaname, tablename]
  )

  // Map the result to the OutType.Policy format
  return rows.map((row) => {
    // Construct the policy definition
    const policyDef = `CREATE POLICY ${row.policyname} 
      ON ${schemaname}.${tablename}
      FOR ${row.cmd}
      ${row.roles === "{public}" ? "" : `TO ${row.roles}`}
      USING (${row.qual || "true"})
      WITH CHECK (${row.with_check || "true"});`

    return {
      name: row.policyname,
      query: policyDef,
    }
  })
}
