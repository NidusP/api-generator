"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatorApis = exports.getApiDoc = exports.genHelper = exports.gen = exports.parseResponses = exports.parseParameters = exports.parseController = exports.parseDefinitions = exports.transverter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const const_1 = require("./const");
const enum_1 = require("./enum");
/**
 * @description 根据路径生成函数名称
 * @params 路径地址
 * @return 函数名
 *
 */
function transverter(path) {
    return path
        .split("/")
        .filter((item) => item)
        .map((item, index) => index > 0 ? item.charAt(0).toLocaleUpperCase() + item.slice(1) : item)
        .join("");
}
exports.transverter = transverter;
/**
 * @description 处理definitions代表的json结构
 * @params
 * @return 函数名
 *
 */
function parseDefinitions(definitions) {
    let namespace = `declare namespace API {`;
    for (let key in definitions) {
        const properties = definitions[key];
        let val = "";
        for (let i in properties.properties) {
            if (properties.properties[i].type === "array") {
                val += `${i}: string[], 
`;
            }
            else {
                val += `${i}: ${enum_1.FieldType[properties.properties[i].type]}
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
exports.parseDefinitions = parseDefinitions;
/**
 * @description 解析swagger返回的controller信息
 * @return 函数名
 *
 */
function parseController() { }
exports.parseController = parseController;
/**
 * @description 解析接口的入参信息
 * @return 返回入参类型
 *
 */
function parseParameters(parameters) {
    let data = "", params = "";
    parameters?.forEach((item) => {
        if (item.in === "query") {
            params += `${item.name}: ${enum_1.FieldType[item.type || item.schema.type]}, `;
        }
        else if (item.in === "body") {
            if (item.schema.$ref) {
                const refSchema = item.schema.$ref;
                data += `${const_1.NameSpace}${getRefSChema(refSchema)}`;
            }
            else if (item.schema.type === "array") {
                data += `${item.name}: ${enum_1.FieldType[item.schema.items.type]}[], `;
            }
            else {
                data += `${item.name}: ${enum_1.FieldType[item.schema.type]}, `;
            }
        }
    });
    params && (params = `{ ${params} }`);
    data && !data.includes(const_1.NameSpace) && (data = `{ ${data} }`);
    return [params, data];
}
exports.parseParameters = parseParameters;
function parseResponses(response) {
    const schemaRef = response["200"].schema?.$ref;
    if (!schemaRef)
        return "";
    return `<${const_1.NameSpace}${getRefSChema(schemaRef)}>`;
}
exports.parseResponses = parseResponses;
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
function gen(fnName, method, path, data, params, response, apiInfo) {
    return `
/**
 * @description ${(apiInfo.tags, apiInfo.summary)}
 * @operationId ${apiInfo.operationId}
 * @params ${params}
 * @data ${data}
*/
export function ${fnName}(${data && "data: " + data}${params && "params: " + params}){
  return apiRequest${response}({
    method: '${method}',
    url: '${path}',
    ${params &&
        `params,
    `}${data &&
        `data,
  `}})
}
`;
}
exports.gen = gen;
function genHelper(baseDir) {
    const filepath = path_1.default.resolve(baseDir + "/helper.ts");
    if (!fs_1.default.existsSync(filepath)) {
        fs_1.default.writeFileSync(filepath, "// helper content", "utf-8");
    }
}
exports.genHelper = genHelper;
function getRefSChema(ref) {
    return ref.substring(14);
}
async function getApiDoc(url) {
    return new Promise((resolve, reject) => {
        http_1.default.get(url, (res) => {
            const { statusCode } = res;
            const contentType = res.headers["content-type"];
            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
            }
            else if (!/^application\/json/.test(contentType)) {
                error = new Error("Invalid content-type.\n" +
                    `Expected application/json but received ${contentType}`);
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
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    });
}
exports.getApiDoc = getApiDoc;
function generatorApis(data) {
    const { paths, tags, definitions } = str2Json(data);
    if (!fs_1.default.existsSync(const_1.BaseDir)) {
        fs_1.default.mkdirSync(const_1.BaseDir);
    }
    genHelper(const_1.BaseDir);
    // 处理body中的json数据
    const typingContent = parseDefinitions(definitions);
    fs_1.default.writeFileSync(const_1.BaseDir + "/typing.d.ts", typingContent, "utf-8");
    // 处理url
    for (const path in paths) {
        const apiFile = path.substring(0, path.indexOf("/", 1));
        const file = const_1.BaseDir + apiFile + ".ts";
        if (!fs_1.default.existsSync(file)) {
            fs_1.default.writeFileSync(file, const_1.HeadTemplate, "utf-8");
        }
        else {
            // return;
            // fs.writeFileSync(file, `import { apiRequest } from './helper'`, "utf-8");
        }
        /**
         * @constant 函数名
         */
        const fnName = transverter(path);
        for (const method in paths[path]) {
            const apiInfo = paths[path][method];
            let [params, data] = parseParameters(apiInfo.parameters);
            let res = parseResponses(apiInfo.responses);
            const fn = gen(fnName, method, path, data, params, res, apiInfo);
            fs_1.default.appendFileSync(file, fn);
        }
    }
    return const_1.BaseDir;
}
exports.generatorApis = generatorApis;
function str2Json(data) {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        throw e;
    }
}
