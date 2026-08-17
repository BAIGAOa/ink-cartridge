import React from "react"

export type Page = {
    component: React.ComponentType<any>
    regionFocus: Map<string, boolean>
}