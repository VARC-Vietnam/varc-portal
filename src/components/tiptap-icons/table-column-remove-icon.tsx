import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableColumnRemoveIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 5C2 3.89543 2.89543 3 4 3H14C15.1046 3 16 3.89543 16 5V20C16 21.1046 15.1046 22 14 22H4C2.89543 22 2 21.1046 2 20V5ZM8 5H4V10H8V5ZM10 5V10H14V5H10ZM14 12H10V20H14V12ZM8 20V12H4V20H8Z"
        fill="currentColor"
      />
      <path d="M15 11C14.4477 11 14 11.4477 14 12C14 12.5523 14.4477 13 15 13H23C23.5523 13 24 12.5523 24 12C24 11.4477 23.5523 11 23 11H15Z" fill="currentColor" />
    </svg>
  )
})

TableColumnRemoveIcon.displayName = "TableColumnRemoveIcon"
