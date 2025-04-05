declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BING_API_KEY?: string;
      E2B_API_KEY?: string;
      OPENAI_API_BASE?: string;
      OPENAI_API_KEY?: string;
      REPLICATE_API_KEY?: string;
      UNSTRUCTURED_API_KEY?: string;
      UNSTRUCTURED_SERVER_URL?: string;
      WOLFRAM_API_KEY?: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
