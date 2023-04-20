import fs from "fs";
import http from "http";
import data from "../data.json";
import { gen, parseDefinitions, parseParameters, transverter } from "./utils";
import { FieldType, FieldTypeKey } from "./utils/enum";

// .on("error", (e) => {
//   console.error(`Got error: ${e.message}`);
// });
export interface ApiDoc {
  swagger: string;
  info: any;
  host: string;
  basePath: string;
  paths: Record<string, { [x: string]: ApiInfo }>;
  tags: Array<{ name: string }>;
  definitions: {
    [key: string]: {
      type: "";
      properties: Record<
        string,
        {
          type: FieldTypeKey;
        }
      >;
    };
  };
}

export type ApiInfo = {
  tags: Array<string>;
  summary: string;
  operationId: string;
  parameters?: Array<{
    name: string;
    in: "query" | "body" | "formData";
    description: string;
    required: boolean;
    type: FieldTypeKey;
    schema: {
      $ref?: string;
      type: FieldTypeKey;
      items: {
        type: FieldTypeKey;
      };
    };
    format: string;
  }>;
};
function parseApiDoc(str: string) {
  try {
    const apiJson = JSON.parse(str);
    console.log(apiJson);
  } catch {}
}

function getApiDoc() {
  http.get("http://192.168.1.176:11287/v3/nlp/v2/api-docs", (res) => {
    const { statusCode } = res;
    const contentType = res.headers["content-type"];

    let error;
    // Any 2xx status code signals a successful response but
    // here we're only checking for 200.
    if (statusCode !== 200) {
      error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType!)) {
      error = new Error(
        "Invalid content-type.\n" +
          `Expected application/json but received ${contentType}`
      );
    }
    if (error) {
      console.error(error.message);
      // Consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding("utf8");
    let rawData = "";
    res.on("data", (chunk) => {
      rawData += chunk;
    });

    res.on("end", () => {
      try {
        parseApiDoc(rawData);
      } catch (e) {
        console.error(e);
      }
    });
  });
}
const baseDir = "./api";
function generatorApis() {
  const { paths, tags, definitions } = data as unknown as ApiDoc;
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  // 处理body中的json数据

  const typingContent = parseDefinitions(definitions);
  fs.writeFileSync(baseDir + '/typing.ts', typingContent, "utf-8");
  return;
  // 处理url
  for (const path in paths) {
    const apiFile = path.substring(0, path.indexOf("/", 1));

    const file = baseDir + apiFile + ".ts";
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
    } else {
      // return;
      // fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
    }

    /**
     * @constant 函数名
     *
     */
    const fnName = transverter(path);

    for (const method in paths[path]) {
      const apiInfo: ApiInfo = paths[path][method];

      let [params, data] = parseParameters(apiInfo.parameters);

      const fn = gen(fnName, method, path, data, params, apiInfo);
      fs.appendFileSync(file, fn);
    }
  }
}

generatorApis();
