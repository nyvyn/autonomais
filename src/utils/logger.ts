import * as console from "node:console";

let VERBOSE_LOGGING = false;

export function enableVerboseLogging(enabled: boolean = true) {
    VERBOSE_LOGGING = enabled;
}

export function log(...args: any[]) {
    if (VERBOSE_LOGGING) {
        console.log(...args);
    }
}