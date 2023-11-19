export const getObjFromArray = <T>(ar: T[], k: keyof T): Record<string, T> => {
  const obj: Record<string, T> = {}
  for (const item of ar) {
    obj[item[k as any]] = item
  }
  return obj
}
