import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRowAddIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M4 3C2.89543 3 2 3.89543 2 5V15C2 16.1046 2.89543 17 4 17H20C21.1046 17 22 16.1046 22 15V5C22 3.89543 21.1046 3 20 3H4ZM4 10V5H10V10H4ZM12 10V5H20V10H12ZM20 12H12V15H20V12ZM10 15V12H4V15H10Z"
        fill="currentColor"
      />
      <path d="M12 19C12 18.4477 12.4477 18 13 18H16V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18H21C21.5523 18 22 18.4477 22 19C22 19.5523 21.5523 20 21 20H18V23C18 23.5523 17.5523 24 17 24C16.4477 24 16 23.5523 16 23V20H13C12.4477 20 12 19.5523 12 19Z" fill="currentColor" />
    </svg>
  )
})

TableRowAddIcon.displayName = "TableRowAddIcon"
