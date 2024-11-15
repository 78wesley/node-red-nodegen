/**
 * Copyright OpenJS Foundation and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

const FunctionNodeGenerator = require("./function");
const SwaggerNodeGenerator = require("./swagger");
const WebOfThingsGenerator = require("./webofthings");
const SubflowNodeGenerator = require("./subflow");
const SubflowsNodeGenerator = require("./subflows");

module.exports = {
    FunctionNodeGenerator: FunctionNodeGenerator,
    SwaggerNodeGenerator: SwaggerNodeGenerator,
    WebOfThingsGenerator: WebOfThingsGenerator,
    SubflowNodeGenerator: SubflowNodeGenerator,
    SubflowsNodeGenerator: SubflowsNodeGenerator
};
