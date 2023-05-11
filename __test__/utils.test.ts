import { transverter } from "../src/utils";

describe("transverter path", () => {
  it("url -> fnName", () => {
    expect(transverter("/aaa/bbb/ccc")).toEqual("aaaBbbCcc");
  });
});
