export function transverter(path: string): string {
  return path
    .split("/")
    .filter((item) => item)
    .map((item, index) =>
      index > 0 ? item.charAt(0).toLocaleUpperCase() + item.slice(1) : item
    )
    .join("");
}
