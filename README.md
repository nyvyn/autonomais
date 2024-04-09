# Autonomais

**Effortlessly simple agent-based workflows!**

## What is Autonomais?

Autonomais is a framework designed to facilitate the creation and management of AI agents 
that can work collaboratively on complex tasks. It allows users to define workflows for agents 
using simple YAML configuration files. These workflows can include a variety of tasks such as processing data, interacting with APIs, and communicating with other agents. The goal of Autonomais is to make it easier to build systems where multiple AI agents can work together to achieve goals that would be difficult for a single agent to accomplish alone.

## Technologies Used

Autonomais is built using a variety of modern technologies to ensure efficiency, reliability, and ease of use:

- **Langchain**: A set of libraries for working with language models and graph-based data structures in AI applications.
- **LangGraph**: A library for creating and managing graph-based data structures, facilitating complex interactions between AI agents.
- **Yargs**: A Node.js library for building command-line tools with powerful argument parsing.
- **Jest**: A delightful JavaScript Testing Framework with a focus on simplicity, used for unit testing.

## Running the Product

## Contributing

We welcome contributions from the community! If you're interested in helping to improve Autonomais, please follow these steps:

1. **Fork the repository**: Make a copy of the project on your own account to work on.
2. **Create a branch**: Create a branch in your fork for your changes.
3. **Make your changes**: Implement your changes, add new features, or fix bugs.
4. **Write tests**: Ensure that your changes are covered by tests and that all tests pass.
5. **Document your changes**: Update the README or any relevant documentation with details of your changes.
6. **Open a pull request**: Submit a pull request to the main repository with a clear description of what your changes do.

Please make sure to adhere to the project's coding standards and include appropriate tests and documentation with your contributions.

To run Autonomais with an example workflow, you can use the provided `helloworld.yaml` example. First, ensure you have built the project by running:

You can execute the example workflow using the CLI:

```sh
npm run demo
```

This command will run the `src/cli.ts` script with the `examples/helloworld.yaml` workflow file. 
You can also run any other workflow file by replacing `examples/helloworld.yaml` 
with the path to your desired workflow file.
