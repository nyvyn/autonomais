# Autonomais

Effortlessly simple agent-based workflows!

## What is Autonomais?

Autonomais is a framework designed to facilitate the creation and management of AI agents 
that can work collaboratively on complex tasks. It allows users to define workflows for agents 
using simple YAML configuration files. These workflows can include a variety of tasks such as processing data, interacting with APIs, and communicating with other agents. The goal of Autonomais is to make it easier to build systems where multiple AI agents can work together to achieve goals that would be difficult for a single agent to accomplish alone.

## Running the Product

To run Autonomais with an example workflow, you can use the provided `helloworld.yaml` example. First, ensure you have built the project by running:

You can execute the example workflow using the CLI:

```sh
npm run demo
```

This command will run the `src/cli.ts` script with the `examples/helloworld.yaml` workflow file. 
You can also run any other workflow file by replacing `examples/helloworld.yaml` 
with the path to your desired workflow file.
