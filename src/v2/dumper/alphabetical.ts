export const alphabeticalByKey = (k) => (a, b) => {
  if (a[k] < b[k]) {
    return -1
  }
  if (a[k] > b[k]) {
    return 1
  }
  return 0
}
export const alphabetical = (a, b) => {
  if (a.sequence_name < b.sequence_name) {
    return -1
  }
  if (a.sequence_name > b.sequence_name) {
    return 1
  }
  return 0
}
