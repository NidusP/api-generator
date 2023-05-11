import fs from "fs";
import path, { resolve } from "path";
import http from "http";

import { NameSpace, BaseDir, HeadTemplate } from "./const";
import { FieldType, ApiDoc, ApiInfo } from "./enum";

/**
 * @description 根据路径生成函数名称
 * @params 路径地址
 * @return 函数名
 *
 */
export function transverter(path: string): string {
  return path
    .split("/")
    .filter((item) => item)
    .map((item, index) =>
      index > 0 ? item.charAt(0).toLocaleUpperCase() + item.slice(1) : item
    )
    .join("");
}

/**
 * @description 处理definitions代表的json结构
 * @params
 * @return 函数名
 *
 */
export function parseDefinitions(definitions: ApiDoc["definitions"]) {
  let namespace = `declare namespace API {`;
  for (let key in definitions) {
    const properties = definitions[key];
    let val = "";
    for (let i in properties.properties) {
      if (properties.properties[i].type === "array") {
        val += `${i}: string[], 
`;
      } else {
        val += `${i}: ${FieldType[properties.properties[i].type]}
`;
      }
    }
    namespace += `
  export interface ${key} {
    ${val}
  }
`;
  }
  namespace += `
}`;
  return namespace;
}

/**
 * @description 解析swagger返回的controller信息
 * @return 函数名
 *
 */
export function parseController() {}

/**
 * @description 解析接口的入参信息
 * @return 返回入参类型
 *
 */
export function parseParameters(parameters: ApiInfo["parameters"]) {
  let data = "",
    params = "";
  parameters?.forEach((item) => {
    if (item.in === "query") {
      params += `${item.name}: ${FieldType[item.type || item.schema.type]}, `;
    } else if (item.in === "body") {
      if (item.schema.$ref) {
        const refSchema = item.schema.$ref;
        data += `${NameSpace}${getRefSChema(refSchema)}`;
      } else if (item.schema.type === "array") {
        data += `${item.name}: ${FieldType[item.schema.items.type]}[], `;
      } else {
        data += `${item.name}: ${FieldType[item.schema.type]}, `;
      }
    }
  });

  params && (params = `{ ${params} }`);
  data && !data.includes(NameSpace) && (data = `{ ${data} }`);
  return [params, data] as const;
}

export function parseResponses(response: ApiInfo["responses"]) {
  const schemaRef = response["200"].schema?.$ref;
  if (!schemaRef) return "";
  return `<${NameSpace}${getRefSChema(schemaRef)}>`;
}
/**
 * @description 函数体生成模版
 * @params {fnName: 方法名}
 * @params method: 请求类型
 * @params path: url路径
 * @params data: 请求体参数
 * @params params: 查询参数
 * @return 生成函数体
 *
 */
export function gen(
  fnName: string,
  method: string,
  path: string,
  data: string,
  params: string,
  response: string,
  apiInfo: ApiInfo
) {
  return `
/**
 * @description ${(apiInfo.tags, apiInfo.summary)}
 * @operationId ${apiInfo.operationId}
 * @params ${params}
 * @data ${data}
*/
export function ${fnName}(${data && "data: " + data}${
    params && "params: " + params
  }){
  return apiRequest${response}({
    method: '${method}',
    url: '${path}',
    ${
      params &&
      `params,
    `
    }${
    data &&
    `data,
  `
  }})
}
`;
}

export function genHelper(baseDir: string) {
  const filepath = path.resolve(baseDir + "/helper.ts");
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, "// helper content", "utf-8");
  }
}

function getRefSChema(ref: string) {
  return ref.substring(14);
}

export async function getApiDoc(url: string) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
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
          resolve(rawData);
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

export function generatorApis(data: string) {
  const { paths, tags, definitions } = str2Json<ApiDoc>(data);

  if (!fs.existsSync(BaseDir)) {
    fs.mkdirSync(BaseDir);
  }

  genHelper(BaseDir);
  // 处理body中的json数据
  const typingContent = parseDefinitions(definitions);
  fs.writeFileSync(BaseDir + "/typing.d.ts", typingContent, "utf-8");

  // 处理url
  for (const path in paths) {
    const apiFile = path.substring(0, path.indexOf("/", 1));

    const file = BaseDir + apiFile + ".ts";
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, HeadTemplate, "utf-8");
    } else {
      // return;
      // fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
    }

    /**
     * @constant 函数名
     */
    const fnName = transverter(path);

    for (const method in paths[path]) {
      const apiInfo: ApiInfo = paths[path][method];

      let [params, data] = parseParameters(apiInfo.parameters);
      let res = parseResponses(apiInfo.responses);

      const fn = gen(fnName, method, path, data, params, res, apiInfo);
      fs.appendFileSync(file, fn);
    }
  }

  return BaseDir;
}

function str2Json<T>(data: string): T {
  try {
    return JSON.parse(data);
  } catch (e) {
    throw e;
  }
}
