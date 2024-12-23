let VERBOSE_LOGGING = false;

const stringToBoolean = (string) => (string === "false" ? false : !!string);

export function enableVerboseLogging(enabled: boolean = true) {
  VERBOSE_LOGGING = enabled;
}

export function logger(...args: any[]) {
  VERBOSE_LOGGING =
    VERBOSE_LOGGING || stringToBoolean(process.env.VERBOSE_LOGGING);
  if (VERBOSE_LOGGING) {
    console.log(...args);
  }
}
