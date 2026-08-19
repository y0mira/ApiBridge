import Editor, { loader, type EditorProps } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

loader.config({ monaco })

export default function LazyEditor(props: EditorProps) {
  return <Editor {...props} />
}
