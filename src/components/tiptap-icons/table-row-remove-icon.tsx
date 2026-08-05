import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRowRemoveIcon = memo(({ className, ...props }: SvgProps) => {
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
      <path d="M13 18C12.4477 18 12 18.4477 12 19C12 19.5523 12.4477 20 13 20H21C21.5523 20 22 19.5523 22 19C22 18.4477 21.5523 18 21 18H13Z" fill="currentColor" />
    </svg>
  )
})

TableRowRemoveIcon.displayName = "TableRowRemoveIcon"
