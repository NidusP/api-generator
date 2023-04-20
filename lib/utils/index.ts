import { ApiDoc, ApiInfo } from "..";
import { FieldType, FieldTypeKey } from "./enum";

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
  let namespace = `namespace API {`;
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
      } else if (item.schema.type === "array") {
        data += `${item.name}: ${FieldType[item.schema.items.type]}[], `;
      } else {
        data += `${item.name}: ${FieldType[item.schema.type]}, `;
      }
    }
  });

  params && (params = `{ ${params} }`);
  data && (data = `{ ${data} }`);
  return [params, data] as const;
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
  return apiRequest({
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
