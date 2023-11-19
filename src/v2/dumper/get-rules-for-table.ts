import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getRulesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Rule[]> => {
  return [] // TODO
}
