import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const FilePlusIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M5 1C3.34315 1 2 2.34315 2 4V20C2 21.6569 3.34315 23 5 23H14C15.6569 23 17 21.6569 17 20V8.41421C17 7.61856 16.6839 6.8555 16.1213 6.29289L11.7071 1.87868C11.1445 1.31607 10.3814 1 9.58579 1H5ZM9 3.41421V7C9 8.10457 9.89543 9 11 9H14.5858L15 9.41421V20C15 20.5523 14.5523 21 14 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H9.58579L9 3.41421ZM11 3.82843L14.1716 7H11V3.82843Z"
        fill="currentColor"
      />
      <path d="M19 11C19.5523 11 20 11.4477 20 12V14H22C22.5523 14 23 14.4477 23 15C23 15.5523 22.5523 16 22 16H20V18C20 18.5523 19.5523 19 19 19C18.4477 19 18 18.5523 18 18V16H16C15.4477 16 15 15.5523 15 15C15 14.4477 15.4477 14 16 14H18V12C18 11.4477 18.4477 11 19 11Z" fill="currentColor" />
    </svg>
  )
})

FilePlusIcon.displayName = "FilePlusIcon"
