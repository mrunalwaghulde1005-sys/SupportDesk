
import { csvToJson } from "../src/csvToJson";

describe("csvToJson", () => {
  test("converts CSV rows into JSON objects", () => {
    const csv = "name,age\nAmit,22\nPriya,23";

    expect(csvToJson(csv)).toEqual([
      { name: "Amit", age: "22" },
      { name: "Priya", age: "23" },
    ]);
  });

  test("returns empty array for empty input", () => {
    expect(csvToJson("")).toEqual([]);
  });

  test("returns empty array for header-only CSV", () => {
    expect(csvToJson("name,age")).toEqual([]);
  });

  test("trims whitespace around headers and values", () => {
    const csv = " name , age \n Amit , 22 ";

    expect(csvToJson(csv)).toEqual([{ name: "Amit", age: "22" }]);
  });
});