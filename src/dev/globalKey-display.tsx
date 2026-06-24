import React, { useContext, useEffect, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useKeyboard } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { GlobalProps } from "./types.js";
import { useScreenSystem } from "../screen/hook.js";

// This modal box is used to display information about all registered global keys.
// Because it is a modal box, its keyboard is independent and will not be affected by DevTool.
// Also make sure that the zindex is greater than the zindex of the DevTool so that the visual effects and keyboard reception are applied correctly when the modal box is opened

const PANEL_HEIGHT = 30;

export default function GlobalKeyDisplayBox({ top: initialTop, left }: GlobalProps) {
  const { boundKeyboard } = useKeyboard()
  const { closeModal } = useScreenSystem()
  const modalId = useContext(ModalContext)
  const { rows } = useWindowSize()

  const [offsetTop, setOffsetTop] = useState(initialTop)

  // Stable ref so the []-deps keyboard effect always reads the latest
  // rows-based clamp, preventing a stale-closure on the initial size.
  const clampTopRef = useRef((next: number) => next)
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT))

  useEffect(() => {
    const u1 = boundKeyboard(['up'], () =>
      setOffsetTop(prev => clampTopRef.current(prev - 1)),
    )
    const u2 = boundKeyboard(['down'], () =>
      setOffsetTop(prev => clampTopRef.current(prev + 1)),
    )
    const u3 = boundKeyboard(['escape'], () => {
      if (modalId) {
        closeModal(modalId)
      }
    })
    return () => {
      u1()
      u2()
      u3()
    }
  }, [modalId])

  // When the terminal is resized the current position may land outside
  // the new bounds — re-clamp so the panel stays visible immediately.
  useEffect(() => {
    setOffsetTop(prev => clampTopRef.current(prev))
  }, [rows])

  return (
    <Box
      position="absolute"
      top={offsetTop}
      left={left}
      height={PANEL_HEIGHT}
      width='100%'
      borderStyle='bold'
      borderColor='white'
    >
      <Box justifyContent="center" alignContent="center" height='100%' width='100%'>
        <Text bold color='yellow'>
          Under development...
        </Text>
      </Box>
    </Box>
  )
}
