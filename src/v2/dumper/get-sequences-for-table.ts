import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getSequencesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Sequence[]> => {
  return [] // TODO
}
