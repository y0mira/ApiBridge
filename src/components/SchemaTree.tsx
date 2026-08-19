import { ChevronRight, Copy } from 'lucide-react'
import { useState } from 'react'
import type { Schema } from '../core/types'

type Props = { schema: Schema; name?: string; pointer?: string; readable?: string; depth?: number }
export function SchemaTree({
  schema,
  name = 'schema',
  pointer = '#',
  readable = '$',
  depth = 0,
}: Props) {
  const [open, setOpen] = useState(depth < 2)
  const properties = (schema.properties as Record<string, Schema>) ?? {}
  const variants = [
    ...((schema.oneOf as Schema[]) ?? []),
    ...((schema.anyOf as Schema[]) ?? []),
    ...((schema.allOf as Schema[]) ?? []),
  ]
  const children = Object.entries(properties)
  if (schema.items && typeof schema.items === 'object')
    children.push(['items', schema.items as Schema])
  variants.forEach((child, index) => children.push([`variant ${index + 1}`, child]))
  const type = schema.$ref
    ? String(schema.$ref).split('/').at(-1)
    : Array.isArray(schema.type)
      ? schema.type.join(' | ')
      : String(schema.type ?? (schema.enum ? 'enum' : 'unknown'))
  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    await navigator.clipboard.writeText(`${pointer}\n${readable}`)
  }
  return (
    <div className="schema-node">
      <div className="schema-row" style={{ paddingLeft: depth * 14 }}>
        <button
          className="tree-toggle"
          onClick={() => setOpen(!open)}
          aria-label={`${open ? '折叠' : '展开'} ${name}`}
          disabled={!children.length}
        >
          <ChevronRight className={open ? 'rotated' : ''} size={14} />
        </button>
        <span className="schema-name">{name}</span>
        <span className="schema-type">{type}</span>
        {schema.nullable === true && <span className="badge">nullable</span>}
        {Array.isArray(schema.enum) && (
          <span className="schema-enum">{schema.enum.map(String).join(' · ')}</span>
        )}
        <button
          className="icon-button copy-pointer"
          onClick={copy}
          aria-label={`复制 ${name} 路径`}
          title={`${pointer}\n${readable}`}
        >
          <Copy size={13} />
        </button>
      </div>
      {open &&
        children.map(([key, child]) => (
          <SchemaTree
            key={key}
            schema={child}
            name={key}
            pointer={`${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`}
            readable={key === 'items' ? `${readable}[]` : `${readable}.${key}`}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
