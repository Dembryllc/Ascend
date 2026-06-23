declare module 'mammoth' {
  interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  interface InputOptions {
    arrayBuffer?: ArrayBuffer
  }
  export function convertToHtml(input: InputOptions): Promise<ConvertResult>
  export function extractRawText(input: InputOptions): Promise<ConvertResult>
}
