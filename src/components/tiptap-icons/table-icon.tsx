import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M4 3C2.89543 3 2 3.89543 2 5V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V5C22 3.89543 21.1046 3 20 3H4ZM4 8V5H10V8H4ZM12 8V5H20V8H12ZM20 10H12V14H20V10ZM20 16H12V19H20V16ZM10 19V16H4V19H10ZM4 14H10V10H4V14Z"
        fill="currentColor"
      />
    </svg>
  )
})

TableIcon.displayName = "TableIcon"
