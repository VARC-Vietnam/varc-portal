import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableColumnAddIcon = memo(({ className, ...props }: SvgProps) => {
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
      <path d="M18 8C18 7.44772 18.4477 7 19 7C19.5523 7 20 7.44772 20 8V11H23C23.5523 11 24 11.4477 24 12C24 12.5523 23.5523 13 23 13H20V16C20 16.5523 19.5523 17 19 17C18.4477 17 18 16.5523 18 16V13H15C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11H18V8Z" fill="currentColor" />
    </svg>
  )
})

TableColumnAddIcon.displayName = "TableColumnAddIcon"
