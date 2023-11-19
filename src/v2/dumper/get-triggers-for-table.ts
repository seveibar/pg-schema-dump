import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getTriggersForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Trigger[]> => {
  // Query the database to get triggers for the given table
  const { rows } = await ctx.client.query(
    `
    SELECT tg.tgname AS trigger_name, pg_get_triggerdef(tg.oid) AS trigger_def, p.proname AS function_name
    FROM pg_trigger tg
    JOIN pg_class cls ON tg.tgrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    JOIN pg_proc p ON tg.tgfoid = p.oid
    WHERE nsp.nspname = $1 AND cls.relname = $2 AND NOT tg.tgisinternal;
  `,
    [schemaname, tablename]
  )

  // Map the result to the OutType.Trigger format
  return rows.map((row) => ({
    name: row.trigger_name,
    functionName: row.function_name,
    query: row.trigger_def,
  }))
}
