import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRemoveIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M4 3C2.89543 3 2 3.89543 2 5V19C2 20.1046 2.89543 21 4 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3H4ZM4 8V5H10V8H4ZM12 8V5H18V8H12ZM18 10H12V14H18V10ZM18 16H12V19H18V16ZM10 19V16H4V19H10ZM4 14H10V10H4V14Z"
        fill="currentColor"
      />
      <path d="M18.2929 11.8787C17.9024 11.4882 17.9024 10.855 18.2929 10.4645C18.6834 10.074 19.3166 10.074 19.7071 10.4645L21 11.7574L22.2929 10.4645C22.6834 10.074 23.3166 10.074 23.7071 10.4645C24.0976 10.855 24.0976 11.4882 23.7071 11.8787L22.4142 13.1716L23.7071 14.4645C24.0976 14.855 24.0976 15.4882 23.7071 15.8787C23.3166 16.2692 22.6834 16.2692 22.2929 15.8787L21 14.5858L19.7071 15.8787C19.3166 16.2692 18.6834 16.2692 18.2929 15.8787C17.9024 15.4882 17.9024 14.855 18.2929 14.4645L19.5858 13.1716L18.2929 11.8787Z" fill="currentColor" />
    </svg>
  )
})

TableRemoveIcon.displayName = "TableRemoveIcon"
