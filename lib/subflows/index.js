const util = require("../util");
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const crypt = require("crypto-js");

const TEMPLATE_DIR = path.join(__dirname, '../../templates/subflows');

// Extract Subflows definition from JSON data
function getSubflowsDef(flow) {
    const subflows = [];
    flow.forEach((item) => {
        if (item.hasOwnProperty("meta") && item.meta.hasOwnProperty("module")) {
            subflows.push(item);
        }
    });
    if (subflows.length === 0) {
        throw new Error("No module properties in subflows");
    }
    return subflows;
}

// get flow encoding method
function getEncoder(encoding) {
    if (encoding === "AES") {
        return function (flow, key) {
            const data = JSON.stringify(flow);
            const enc = crypt.AES.encrypt(data, key);
            return enc.toString();
        }
    }
    throw new Error("encoding not defined:" + encoding);
}

// Create JSON data file 
//TODO fix issue with flow export to subflow.json, there is now "flow key "
function createJSON(dstPath, flow, encoding, key) {
    const [sf, newFlow] = getSubflowsDef(flow);
    if (encoding && (encoding !== "none")) {
        const encode = getEncoder(encoding);
        const encStr = encode(newFlow, key);
        sf.flow = {
            encoding: encoding,
            flow: encStr
        };
    } else {
        sf.flow = newFlow;
    }
    const data = JSON.stringify(sf, null, 4);
    fs.writeFileSync(dstPath, data);
}


module.exports = async function (data, options) {
    "use strict";

    const json = data.src;

    // Get all subflows
    const subflows = getSubflowsDef(json);

    // Directory for all subflows under data.name
    const mainDir = path.join(data.dst, data.name);
    try {
        fs.mkdirSync(mainDir, { recursive: true });
    } catch (error) {
        if (error.code !== "EEXIST") {
            throw error;
        }
    }
    const packageParams = {
        projectName: data.name,
        nodeName: [],
    };

    for (const sf of subflows) {
        // Extract meta data for each subflow
        const meta = sf.meta;
        const subflowName = meta.type;
        const subflowDir = path.join(mainDir, subflowName);
        packageParams.nodeName.push(subflowName);

        // Create subflow directory
        try {
            fs.mkdirSync(subflowDir, { recursive: true });
        } catch (error) {
            if (error.code !== "EEXIST") {
                throw error;
            }
        }

        // Set up data properties for the subflow
        data.name = subflowName;
        data.module = meta.module;
        data.version = meta.version;
        data.desc = meta.desc || `Node-RED node for ${subflowName}`;
        data.license = meta.license || "unknown";
        data.keywords = data.keywords || meta.keywords;
        data.info = meta.info;

        const params = {
            nodeName: data.name,
            projectName: data.module,
            projectVersion: data.version,
            keywords: util.extractKeywords(data.keywords),
            category: data.category || "subflows",
            description: data.desc,
            licenseName: data.license,
            nodeRead: sf.info || "",
            encoding: options.encoding
        };

        // Create subflow.json
        createJSON(path.join(subflowDir, "subflow.json"),
            [sf], (options.encoding || "none"), options.encodekey);

        // Create subflows.js
        const nodeTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "subflow.js.mustache"), "utf-8");
        const nodeSourceCode = mustache.render(nodeTemplate, params);
        fs.writeFileSync(path.join(subflowDir, "subflow.js"), nodeSourceCode);
    }

    packageParams.nodeName = util.extractNodeNames(packageParams.nodeName);
    const packageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "package.json.mustache"), "utf-8");
    const packageSourceCode = mustache.render(packageTemplate, packageParams);
    fs.writeFileSync(path.join(mainDir, "package.json"), packageSourceCode);

    if (options.tgz) {
        util.runNpmPack(data);
        return path.join(mainDir, `${data.name}-${data.version}.tgz`);
    } else {
        return mainDir;
    }
}
