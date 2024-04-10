let VERBOSE_LOGGING = false;

export function enableVerboseLogging(enabled: boolean = true) {
    VERBOSE_LOGGING = enabled;
}

export function logger(...args: any[]) {
    if (VERBOSE_LOGGING) {
        console.log(...args);
    }
}