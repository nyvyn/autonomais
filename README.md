<div align="center">

# Autonomais

**Effortlessly simple agent-based workflows**

[![GitHub Repo stars](https://img.shields.io/github/stars/nyvyn/autonomais)](https://github.com/nyvyn/autonomais)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

</div>

<br><br>

## Table of Contents

- [Why Autonomais?](#why-autonomais)
- [Getting Started](#getting-started)
- [Setup](#setup)
- [Key Concepts](#key-concepts)
- [How It Works](#how-it-works)
- [Technologies Used](#technologies-used)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Autonomais?

Autonomais goal is to provide the absolute fastest and simplest way to coordinate multiple AI agents.

Autonomais is a typescript npm library with a commercial-friendly license.
Autonomais also includes an interactive command-line interface for desktop workflows.


## Getting Started

1. As an npm package:

   ```shell
   npm i autonomais
   ```

2. Via the command-line:

   ```shell
   ts-node ./src/autonomais.ts ./examples/echo.yaml
   ```

## Setup

### NPM Package

Set an environment variable for the OpenAI API: `OPENAI_API_KEY`.

### Command-line

Set an environment variable for the OpenAI API: `OPENAI_API_KEY`.

Build the code using the build command in `package.json`:

```shell
npm run build
```

After building the project, you can execute the example interactive command-line workflow using the npm script:

```shell
npm run demo
```

This command will execute the `src/autonomais.ts` script with the `examples/calculator.yaml` workflow file.
You can also run any other workflow file by replacing `examples/calculator.yaml` with the path to your desired
workflow file.

To run with your own workflow, run the following command from your terminal,
replacing `calculator.yaml` with the path to your own agent configuration.

```shell
ts-node ./src/autonomais.ts ./examples/calculator.yaml
```

## Key Concepts

Autonomais helps developers build flexible AI agent workflows.

A workflow is a set of nodes with configured behavior and tools
that collaborate to achieve a provided goal or objective.

Workflows are defined using three types of nodes:

- **Agent Nodes** — agents can optionally use defined tools.
- **Conditional Nodes** — conditionals select the next best node.
- **Exit Nodes** — a special case of Agent Nodes that terminate after completion.

All nodes follow their configured instructions and have access to conversation history.

### Agent nodes

The simplest workflow is one with a single agent; as demonstrated by `./examples/echo.yaml`.
(Note: this is like directly prompting an LLM.)

```yaml
echo:
   instructions: "Repeat back what the user said, or Hello World if none."
```

All nodes are required to have a name (e.g., "hello-world") and instructions.

### Agent nodes can use tools

Agent (and Exit) nodes may be configured to use tools.

```yaml
calculate:
   instructions: "Calculate the provided equation."
   tools: [ "calculator" ]
```

### Chaining nodes

Two nodes defined in succession are a chain. That is, no conditional or exit nodes intervene.

```yaml
researcher:
   instructions: "Your role is to reseach AI topics"
   tools: [ "bing-search" ]

editor:
   instructions: "Edit the research into a compelling narrative"
```

The first agent is expected to search the web and gather information with search and browser tools.
The second is also an agent without tools — relying on the LLM exclusively.

### Exit nodes

Exit nodes are agent nodes that... exit the workflow.

Constraints:

* The last node is always an exit node.
* Conditional nodes cannot be exit nodes.
* Therefore, the last node can never be a conditional node.

Note: Exit nodes can use tools, the same as Agent nodes.

### Conditional nodes

Conditional nodes follow instructions to identify the next best node.
A common use is to ensure that direction has been provided before executing a chain.

```yaml
identify-topic:
   instructions: If the user has not provided a topic, then ask them too. Otherwise start researching.
   conditional: true

ask-for-topic:
   instructions: Ask the user what topic to research.
   exit: true

researcher:
   instructions: Research useful topics on the provided
   exit: true # this is optional, as the last node is an exit node by default.
```

Note: Conditional nodes cannot use tools, only agent and exit nodes can.

### Running the graph

This can be run interactively as follows:

### Via the interactive shell

```shell
ts-node ./src/autonomais.ts ./examples/echo.yaml
```

### Programmatically with yaml

Yaml can be run directly via `src/workflow.ts`, which converts each entry to a `GraphNode`,
which in turn are passed as an array to `GraphRunner`.

```typescript
// Load the yaml file
import { parseWorkflow, runWorkflow } from "./workflow";

const config = fs.readFileSync(path.toString(), "utf-8");

// Parse the yaml file into GraphNodes
const nodes: GraphNode[] = parseWorkflow(config);

// Run the workflow
// Messages are LangChain BaseMessage(s).
runWorkflow(nodes, messages);
```

### Programmatically with json

```typescript
// Tools are defined separately and passed to Agent and Exit nodes.
const nodes: GraphNode[] = [
   {
      name: "hello-world",
      instructions: "Repeat back what the user said, or Hello World if none."
      tools: [tools]
   }
];

// Model is a LangChain BaseModel.
const runner = GraphRunner.make({model, nodes});

// Messages are LangChain BaseMessage(s).
runner.invoke({messages});
```

## How it Works

Autonomais is built on [LangGraph](https://js.langchain.com/docs/langgraph)
and [LangChain](https://js.langchain.com/docs/get_started/introduction),
provding a flexible and powerful foundation.

The key addition of this library is to move the configuration of the graph workflows to attributes of the nodes.
These attributes then guide the setup of the graph as found in `src/agents/GraphRunner`.

In turn, GraphRunner configures nodes as Agents, using `createFunctionCallingExecutor`. This is a prebuilt function
offered by LangGraph here:
[source](https://github.com/langchain-ai/langgraphjs/blob/main/langgraph/src/prebuilt/chat_agent_executor.ts).
This gives agents their tool-using ability.

Conditional nodes use [LCEL](https://js.langchain.com/docs/expression_language/get_started) to determine the next
node to route too. In practice, this is the function configured as part of a conditional edge for a graph:
[addConditionalEdges](https://js.langchain.com/docs/langgraph#addconditionaledges).

Thank you LangChain team!

## Roadmap

A "next up" feature is the ability to dynamically define tools for use by the CLI.
As an aside, this is easy to do when using Autonomais as a library, as the tools can be directly passed
to either the `parseWorkflow(config)` or when defining a `GraphNode`.

## Technologies Used

Autonomais is built using a variety of modern technologies to ensure efficiency, reliability, and ease of use:

- **Langchain**: A set of libraries for working with language models and graph-based data structures in AI applications.
- **LangGraph**: A library for creating and managing graph-based data structures, facilitating complex interactions between AI agents.
- **Yargs**: A Node.js library for building command-line tools with powerful argument parsing.
- **Jest**: A delightful JavaScript Testing Framework with a focus on simplicity, used for unit testing.

## Contributing

We welcome contributions from the community!
If you are interested in helping to improve Autonomais, please follow these steps:

1. **Fork the repository**: Make a copy of the project on your own account to work on.
2. **Create a branch**: Create a branch in your fork for your changes.
3. **Make your changes**: Implement your changes, add new features, or fix bugs.
4. **Write tests**: Ensure that your changes are covered by tests and that all tests pass.
5. **Document your changes**: Update the README or any relevant documentation with details of your changes.
6. **Open a pull request**: Submit a pull request to the main repository with a clear description of what your changes
   do.

Please make sure to adhere to the project's coding standards and include appropriate tests and documentation with your
contributions.

## License

Autonomais is open-sourced software licensed under the MIT license.
<br>
For more information, please see the [LICENSE](LICENSE) file in this repository.