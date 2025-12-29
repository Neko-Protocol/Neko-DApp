declare module "lossless-json" {
  export function parse(
    text: string,
    reviver?: (key: string, value: any) => any
  ): any;
  export function stringify(
    value: any,
    replacer?: (key: string, value: any) => any,
    space?: string | number
  ): string;
  export function toSafeNumberOrThrow(value: any): number;
  export function toLosslessNumber(value: number | string): any;
  export function isNumber(value: any): boolean;
}
