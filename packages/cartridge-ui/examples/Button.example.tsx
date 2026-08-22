import { Box, DOMElement, render, Text } from "ink";
import React, { useEffect, useId, useRef, useState } from "react";
import { Button } from "../src/index.js";
import { CurrentScreen, KeyboardProvider, registerComponent, ScenarioManagementProvider, useKeyboard } from "ink-cartridge";

function ButtonKeyboard({ text }: { text: string }) {
	const { boundKeyboard } = useKeyboard()
	const timerRef = useRef<NodeJS.Timeout | null>(null)
	const [flush, setFlush] = useState(false)
	const id = useId()
	const [count, setCount] = useState(0)
	const boxRef = useRef<DOMElement | null>(null)

	useEffect(() => {
		return boundKeyboard(["s"], () => {
			setFlush(true)

			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}

			timerRef.current = setTimeout(() => {
				setFlush(false)
			}, 150)

			setCount(prev => prev + 1)
		}, {
			ref: boxRef,
			focusId: id
		})
	}, [])

	return (
		<Box height={6} width="100%" borderStyle='bold' borderColor={flush ? 'green' : 'white'}>
			<Button
				onClick={() => {
					setFlush(true)

					if (timerRef.current) {
						clearTimeout(timerRef.current)
					}

					timerRef.current = setTimeout(() => {
						setFlush(false)
					}, 150)

					setCount(prev => prev + 1)
				}}
				ref={boxRef}
			>
				<Text bold>{text} count: {count}</Text>
			</Button>
		</Box>
	)
}

function MainScreen() {
	return (
		<Box height='100%' width='100%' justifyContent="center" alignItems="center" flexDirection="column" gap={1}>
			<ButtonKeyboard text="Button 1" />
			<ButtonKeyboard text="Button 2" />
			<ButtonKeyboard text="Button 3" />
		</Box>
	)
}

registerComponent(MainScreen, {})

render(
	<ScenarioManagementProvider defaultScreen={MainScreen} fullScreen>
		<KeyboardProvider mouse>
			<CurrentScreen />
		</KeyboardProvider>
	</ScenarioManagementProvider>
)
