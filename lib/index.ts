import fs from "fs";
import http from "http";
import data from "../data.json";
import { transverter } from "./utils";
import { FieldType } from "./utils/enum";

// .on("error", (e) => {
//   console.error(`Got error: ${e.message}`);
// });
interface ApiDoc {
  swagger: string;
  info: any;
  host: string;
  basePath: string;
  paths: Record<string, { [x: string]: ApiInfo }>;
  tags: Array<{ name: string }>;
}

type ApiInfo = {
  tags: Array<string>;
  summary: string;
  operationId: string;
  parameters?: Array<{
    name: string;
    in: "query" | "body";
    description: string;
    required: boolean;
    type: "integer";
    schema: {
      type: "integer";
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
  const { paths, tags } = data as unknown as ApiDoc;
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  for (const path in paths) {
    const apiFile = path.substring(0, path.indexOf("/", 1));

    const file = baseDir + apiFile + ".ts";
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
    } else {
      // fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
    }
    const fnName = transverter(path);

    for (const method in paths[path]) {
      const apiInfo: ApiInfo = paths[path][method];

      let data = "",
        params = "";
      apiInfo.parameters?.forEach((item) => {
        // params
        if (item.in === "query") {
          params += `${item.name}: ${
            FieldType[item.type || item.schema.type]
          }, `;
          // data
        } else if (item.in === "body") {
          data += `${item.name}: ${FieldType[item.type || item.schema.type]}, `;
        }
      });

      params && (params = `{ ${params} }`);
      data && (data = `{ ${data} }`);
      const fn = `
/**
 * @description ${(apiInfo.tags, apiInfo.summary)}
 * @operationId ${apiInfo.operationId}
 * @params ${params}
 * @data ${data}
*/
export function ${fnName}(${data && "data: " + data}${
        params && "params: " + params
      }){
  return apiRequest({
    method: '${method}',
    url: '${path}',
    ${params && `params,
  `}${data && `data,
  `}})
}
`;
      fs.appendFileSync(file, fn);
    }
  }
  // Object.keys(paths).forEach((path) => {

  //   const apis = paths[path as any];
  //   for (const key in apis) {
  //     console.log(typeof path, key, "key");
  //     return
  //     const fn = `
  //   export const ${path.replaceAll("/", "_")} = ${key}
  //   `;
  //     fs.appendFileSync(baseDir + apiDir + ".ts", "");
  //   }
  // });
}

generatorApis();
