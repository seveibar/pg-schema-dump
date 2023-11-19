import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getDomainsForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.Domain[]> => {
  // Query to fetch domain details from the database for the given schema
  const query = `
    SELECT 
      d.domain_name, 
      pg_catalog.pg_get_userbyid(n.nspowner) as domain_owner, 
      d.data_type,
      d.domain_default,
      (
        SELECT 
          string_agg(constraint_name, ', ')
        FROM 
          information_schema.domain_constraints
        WHERE 
          domain_schema = d.domain_schema AND domain_name = d.domain_name
      ) as domain_constraints
    FROM 
      information_schema.domains d
      JOIN pg_catalog.pg_namespace n ON n.nspname = d.domain_schema
      JOIN pg_catalog.pg_type t ON t.typname = d.domain_name
    WHERE 
      d.domain_schema = $1 AND t.typnamespace = n.oid
  `

  // Execute the query and get the results
  const result = await ctx.client.query(query, [schemaname])

  // Map the result to the OutType.Domain format
  return result.rows.map((row) => {
    // Construct the CREATE DOMAIN query
    let createDomainQuery = `CREATE DOMAIN ${schemaname}.${row.domain_name} AS ${row.data_type}`
    if (row.domain_default) {
      createDomainQuery += ` DEFAULT ${row.domain_default}`
    }
    if (row.domain_constraints) {
      createDomainQuery += ` CONSTRAINT ${row.domain_constraints}`
    }
    createDomainQuery += ";"

    return {
      name: row.domain_name,
      owner: row.domain_owner,
      type: row.data_type,
      query: createDomainQuery,
    }
  })
}
