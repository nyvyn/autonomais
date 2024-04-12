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
- [Key Concepts](#key-concepts)
- [Setup](#setup)
- [Contributing](#contributing)
- [Technologies Used](#technologies-used)
- [License](#license)

## Why Autonomais?

Autonomais goal is to provide the absolute fastest and simplest way to coordinate multiple AI agents.

Autonomais is a typescript npm library with a commercial-fiendly license.
Autonomais also includes an interactive command-line interface for desktop workflows.

## Key Concepts

Autonomais simplifies building powerful agentic workflow.

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

## Contributing

We welcome contributions from the community! If you are interested in helping to improve Autonomais, please follow
these steps:

1. **Fork the repository**: Make a copy of the project on your own account to work on.
2. **Create a branch**: Create a branch in your fork for your changes.
3. **Make your changes**: Implement your changes, add new features, or fix bugs.
4. **Write tests**: Ensure that your changes are covered by tests and that all tests pass.
5. **Document your changes**: Update the README or any relevant documentation with details of your changes.
6. **Open a pull request**: Submit a pull request to the main repository with a clear description of what your changes do.

Please make sure to adhere to the project's coding standards and include appropriate tests and documentation with your contributions.

## Technologies Used

Autonomais is built using a variety of modern technologies to ensure efficiency, reliability, and ease of use:

- **Langchain**: A set of libraries for working with language models and graph-based data structures in AI applications.
- **LangGraph**: A library for creating and managing graph-based data structures, facilitating complex interactions between AI agents.
- **Yargs**: A Node.js library for building command-line tools with powerful argument parsing.
- **Jest**: A delightful JavaScript Testing Framework with a focus on simplicity, used for unit testing.

## License

Autonomais is open-sourced software licensed under the MIT license.
<br>
For more information, please see the [LICENSE](LICENSE) file in this repository.
