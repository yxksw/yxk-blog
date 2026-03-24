import ColumnQuickMenu from './ColumnQuickMenu'
import { HoverDropdown } from './HoverDropdown'

export default function ColumnHover({ children }: { children: React.ReactNode }) {
  return (
    <HoverDropdown
      trigger={children}
      panel={<ColumnQuickMenu />}
      closeDelay={200}
      panelClassName="w-[168px]"
    />
  )
}
