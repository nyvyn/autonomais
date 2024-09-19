<div align="center">

# Autonomais

**Effortlessly simple agent-based workflows**

[![GitHub Repo stars](https://img.shields.io/github/stars/nyvyn/autonomais)](https://github.com/nyvyn/autonomais)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

</div>

Autonomais is a typeScript library created
to streamline the deployment and coordination of multiple AI agents within your applications.
Crafted with simplicity and efficiency in mind,
Autonomais helps developers build sophisticated AI agent workflows with minimal overhead.

## Table of Contents

- [Why Autonomais?](#why-autonomais)
- [Getting Started](#getting-started)
- [Setup](#setup)
- [Key Concepts](#key-concepts)
- [Understanding Nodes](#understanding-nodes)
- [How It Works](#how-it-works)
- [Technologies Used](#technologies-used)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Autonomais?

Autonomais is designed with the principles of efficiency and simplicity at its core,
offering a straightforward way to integrate multiple AI agents into your projects.
Whether you're developing intelligent conversational bots, automating data analysis,
or exploring new AI-driven innovations, Autonomais serves as the backbone,
simplifying the orchestration of complex agent interactions.

Key Features:

* Simplicity: Easy to integrate and use with your existing TypeScript projects.
* Flexibility: Accommodates various workflows, from simple task automation to complex agent collaboration.
* Command-line Interface: An optional interactive CLI for quick and direct control of workflows on the desktop.
* Open Source: Licensed under MIT, encouraging both personal and commercial use.

## Getting Started

How to use with your projects:

1. As an npm package:

   Install Autonomais as a dependency in your project:

   ```shell
   npm i autonomais
   ```

2. Via the desktop:

   Experiment and run workflows directly through the interactive command line:

   ```shell
   ts-node ./src/autonomais.ts ./examples/echo.yaml
   ```

Follow the sections below to dive deeper into setting up and using Autonomais in your projects.

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

Autonomais leverages a powerful yet simple concept of workflows to orchestrate AI agent interactions. This section
breaks down the main components that enable you to build versatile and efficient workflows.

### Workflows

Autonomais defines groups of nodes as a **workflow**.
Each workflow encapsulates a goal, guiding multiple agents through a series of tasks to achieve this goal efficiently.

### Nodes

Nodes are the building blocks of a workflow.
They represent distinct steps or operations within a workflow and come in three types:

1. **Agent Nodes**: These are the primary actors within your workflow, carrying out tasks or actions. An agent node can
   be as straightforward as returning input (echo) or as complex as performing data analysis or generating content based
   on specified instructions.
2. **Conditional Nodes**: Conditional nodes act as decision points within your workflow, determining the flow based on
   certain conditions. They help to dynamically alter the path of execution based on the outcome of previous nodes or
   external factors.
3. **Exit Nodes**: As the name suggests, exit nodes are agent nodes that exit upon completion of their work.
   Though typically the last node in your workflow,
   they can also be interspersed to handle various termination conditions or outcomes.

### Node Attributes

- **Instructions**: Directives given to agent nodes, outlining the task to be performed. For example, "Repeat back what
  the user said, or say Hello World if none."
- **Tools**: An optional attribute for agent nodes, specifying any external tools or services employed to achieve the
  node's task.
- **Conditional**: Node is treated as conditional, instructions should guide LLM to choose next best node.
- **Exit**: Node should exit the workflow after completion. In practice, this is an agent node that doesn't continue
  to the next in the chain.
- **Links**: For conditional nodes, optionally specify the nodes that to link to.
  If not specified, all nodes except self are options.

### Constructing a Workflow

Workflows are defined through a YAML or as an array of JS object with attributes that define their behavior and
relationships.
This structure allows for flexible and dynamic workflow designed to address complex agent coordination challenges.

## Understanding Nodes

Important! All three types of nodes follow their configured instructions and have access to conversation history.

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
import { parseWorkflow, runWorkflow } from "autonomais/utils";

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
import { GraphNode } from "autonomais/types";

const nodes: GraphNode[] = [
   {
      name: "hello-world",
      instructions: "Repeat back what the user said, or Hello World if none.",
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
providing a flexible and powerful foundation.

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

* A "next up" feature is the ability to dynamically define tools for use by the CLI.
  As an aside, this is easy to do when using Autonomais as a library,
  as the tools can be directly passed to either the `parseWorkflow(config)` or when defining a `GraphNode`.
* Introduce LangChain FakeLLM to improve testing.
* It would be great to create a `web-browser` tool that doesn't have too many dependencies.
* Ability to constrain which nodes are available for conditional nodes to route to.

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