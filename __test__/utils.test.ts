import { transverter } from "../lib/utils";

describe("transverter path", () => {
  it("url -> fnName", () => {
    expect(transverter("/aaa/bbb/ccc")).toEqual("aaaBbbCcc");
  });
});
