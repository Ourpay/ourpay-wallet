export type ToolResult = (operation: () => Promise<unknown>) => Promise<{
  content: { type: 'text'; text: string }[]
  isError?: boolean
}>

export const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
export const externalReadOnly = { ...readOnly, openWorldHint: true }
export const spending = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
