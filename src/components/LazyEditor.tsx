import Editor, { type EditorProps } from '@monaco-editor/react'

export default function LazyEditor(props: EditorProps) {
  return <Editor {...props} />
}
