export type QuoteAuthorization = {services: string[]; modes: string[]};
export function initialQuoteSelection(initial: {services?: string[];mode?: string}, requested: {services?: string[];mode?: string|null}, authorization?: QuoteAuthorization|null): {services:string[];mode:string};
export function quoteAuthorizationError(quote: {services?:string[];mode:string}, authorization?:QuoteAuthorization|null, labels?:Record<string,string>):string|null;
export function quoteRejectionMessage(message:string):string;
