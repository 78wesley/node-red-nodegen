const util = require("../util");
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const crypt = require("crypto-js");

const TEMPLATE_DIR = path.join(__dirname, '../../templates/subflow');

// Extract all Subflow definitions from JSON data
function getSubflowsDef(flow) {
    const subflows = [];
    const newFlow = [];
    flow.forEach((item) => {
        if (item.hasOwnProperty("meta") && item.meta.hasOwnProperty("module")) {
            subflows.push(item);
        } else {
            newFlow.push(item);
        }
    });
    if (subflows.length === 0) {
        throw new Error("No module properties in any subflow");
    }
    return [subflows, newFlow];
}

// Get flow encoding method
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

// Create JSON data file for multiple subflows
function createJSON(dstPath, subflows, newFlow, encoding, key) {
    const encodedSubflows = subflows.map(sf => {
        const encodedFlow = encoding && encoding !== "none" 
            ? getEncoder(encoding)(newFlow, key) 
            : newFlow;
        
        return {
            ...sf,
            flow: {
                encoding: encoding || "none",
                flow: encodedFlow
            }
        };
    });

    const data = JSON.stringify({ subflows: encodedSubflows }, null, 4);
    fs.writeFileSync(dstPath, data);
}

module.exports = async function(data, options) {
    "use strict";

    const json = data.src;

    // Get subflows & flow definitions
    const [subflows, newFlow] = getSubflowsDef(json);

    // Metadata handling for multiple subflows
    const mainMeta = subflows[0].meta; // Use metadata of the first subflow as main data
    data.name = mainMeta.type;
    data.module = mainMeta.module;
    data.version = mainMeta.version;
    data.desc = mainMeta.desc || `Node-RED node for ${data.name}`;
    data.license = mainMeta.license || "unknown";
    data.keywords = data.keywords || mainMeta.keywords;
    data.info = mainMeta.info;

    const params = {
        nodeName: data.name,
        projectName: data.module,
        projectVersion: data.version,
        keywords: util.extractKeywords(data.keywords),
        category: data.category || "subflow",
        description: data.desc,
        licenseName: data.license,
        nodeRead: data.info || "",
        encoding: options.encoding
    };

    // Create directory if it doesn't exist
    try {
        fs.mkdirSync(path.join(data.dst, data.module), { recursive: true });
    } catch (error) {
        if (error.code !== "EEXIST") {
            throw error;
        }
    }

    // Create subflow.json with all subflows
    createJSON(
        path.join(data.dst, data.module, "subflow.json"),
        subflows,
        newFlow,
        options.encoding || "none",
        options.encodekey
    );

    // Create package.json
    const packageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "package.json.mustache"), "utf-8");
    const packageSourceCode = mustache.render(packageTemplate, params);
    fs.writeFileSync(path.join(data.dst, data.module, "package.json"), packageSourceCode);

    // Create subflow.js
    const nodeTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "subflow.js.mustache"), "utf-8");
    const nodeSourceCode = mustache.render(nodeTemplate, params);
    fs.writeFileSync(path.join(data.dst, data.module, "subflow.js"), nodeSourceCode);

    // Create README.md
    const readmeTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "README.md.mustache"), "utf-8");
    const readmeSourceCode = mustache.render(readmeTemplate, params);
    fs.writeFileSync(path.join(data.dst, data.module, "README.md"), readmeSourceCode);

    // Create LICENSE file
    const licenseTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "LICENSE.mustache"), "utf-8");
    const licenseSourceCode = mustache.render(licenseTemplate, params);
    fs.writeFileSync(path.join(data.dst, data.module, "LICENSE"), licenseSourceCode);

    // Package into tgz if requested
    if (options.tgz) {
        util.runNpmPack(data);
        return path.join(data.dst, `${data.module}-${data.version}.tgz`);
    } else {
        return path.join(data.dst, data.module);
    }
}
