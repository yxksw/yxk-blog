import { useEffect, useState } from 'react'

type ColumnMeta = { slug: string; title: string; count: number }

export default function ColumnQuickMenu() {
  const [cols, setCols] = useState<ColumnMeta[] | null>(null)

  useEffect(() => {
    let aborted = false
    fetch('/columns.json')
      .then((r) => r.json())
      .then((d) => {
        if (!aborted) setCols(d)
      })
      .catch(() => {
        if (!aborted) setCols([])
      })

    return () => {
      aborted = true
    }
  }, [])

  return (
    <div className="w-[168px] rounded-lg border border-primary bg-primary shadow-lg">
      <ul className="py-1 text-sm">
        {cols === null ? (
          <li className="px-3 py-2 text-secondary">加载中...</li>
        ) : cols.length === 0 ? (
          <li className="px-3 py-2 text-secondary">暂无专栏</li>
        ) : (
          cols.map((c) => (
            <li key={c.slug}>
              <a
                className="block px-3 py-1.5 text-center hover:text-accent hover:bg-secondary/60 rounded"
                href={`/columns/${c.slug}`}
              >
                {c.title}
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
