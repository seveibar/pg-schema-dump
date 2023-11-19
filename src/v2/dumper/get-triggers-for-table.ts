import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getTriggersForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Trigger[]> => {
  return [] // TODO
}
