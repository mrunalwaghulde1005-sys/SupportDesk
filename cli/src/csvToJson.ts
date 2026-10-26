
export function csvToJson(csv: string): Record<string, string>[] {
  if (csv.trim() === "") {
    return [];
  }

  const lines = csv.trim().split(/\r?\n/);
  const headerLine = lines[0];

  if (headerLine === undefined || lines.length < 2) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}
