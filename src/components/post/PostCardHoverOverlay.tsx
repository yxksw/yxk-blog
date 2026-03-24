export function PostCardHoverOverlay({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute ${full ? 'inset-0' : 'inset-y-4 -inset-x-4'} rounded-lg bg-accent/10 opacity-0 scale-[0.98] transition duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100`}
      style={{ zIndex: -1 }}
      aria-hidden="true"
    ></div>
  )
}
