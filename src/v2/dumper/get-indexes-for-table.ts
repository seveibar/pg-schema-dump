import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getIndexesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Index[]> => {
  return [] // TODO
}
