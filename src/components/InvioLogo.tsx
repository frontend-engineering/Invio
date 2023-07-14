import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg className="svg-icon invio-sync-wait" viewBox="0 0 100 100" {...props}>
    <g
      fillRule="evenodd"
      style={{
        transform: "scale3d(.89,.99,1.5)",
      }}
    >
      <path
        d="M27 97.93A56.08 56.08 0 0 1 9.29 19.08 55.77 55.77 0 0 0 23.59 50l.07.07c.53.58 1.06 1.14 1.62 1.7s1.12 1.09 1.72 1.62L45.54 72a14.93 14.93 0 0 1 4.53 10.93v1.59a15.12 15.12 0 0 1-8 13.52A15.09 15.09 0 0 1 27 97.93z"
        style={{
          fill: "var(--icon-color)",
        }}
      />
      <path
        fill="#999"
        d="M23.59 50a55.77 55.77 0 0 1-14.3-30.92A56.46 56.46 0 0 1 27 2.08 15.08 15.08 0 0 1 42.11 2a15.12 15.12 0 0 1 8 13.52v1.59A15 15 0 0 1 45.55 28l-22 22z"
        opacity={0.8}
      />
      <path
        d="M85.16 2.08a56.08 56.08 0 0 1 17.67 78.84A55.77 55.77 0 0 0 88.53 50l-.08-.07c-.52-.58-1.06-1.14-1.62-1.7s-1.12-1.09-1.69-1.62L66.58 28a14.93 14.93 0 0 1-4.53-10.93v-1.55A15.12 15.12 0 0 1 70 2a15.08 15.08 0 0 1 15.15.08z"
        style={{
          fill: "var(--icon-color)",
        }}
      />
      <path
        fill="#999"
        d="M88.53 50a55.77 55.77 0 0 1 14.3 30.92 56.35 56.35 0 0 1-17.67 17 15.46 15.46 0 0 1-23.11-13.44v-1.59A15 15 0 0 1 66.57 72l22-22z"
        opacity={0.8}
      />
    </g>
  </svg>
)
export default SvgComponent
