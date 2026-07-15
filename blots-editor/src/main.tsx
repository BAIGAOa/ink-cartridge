/**
 * Markdown Editor — multi-line text editor built on ink-cartridge.
 *
 * Run:
 *   npx tsx blots-editor/src/main.tsx
 */
import React, { useEffect, useState } from 'react';
import { render, Box, useWindowSize, Text } from 'ink';
import {
	registerComponent,
	ScenarioManagementProvider,
	CurrentScreen,
	KeyboardProvider,
	useKeyboard,
	useScreenSystem,
} from 'ink-cartridge';
import Editor from './comp/Editor.js';
import Cmd from './comp/Cmd.js';


function EditorScreen() {
	const [text, setText] = useState('');
	const [currentMode, setCurrentMode] = useState('normal');
	const { rows } = useWindowSize();
	const { setMode, boundKeyboard } = useKeyboard()
	const { openOverlay } = useScreenSystem()
	const [ ediIsFocus, setEdiFocus] = useState<false | undefined>(undefined)

	useEffect(() => {
		const u1 = boundKeyboard(['i'], () => {
			setMode('editor')
			setCurrentMode('editor')
		}, {
			mode: 'normal'
		})

		const u2 = boundKeyboard(['escape'], () => {
			setMode('normal')
			setCurrentMode('normal')
		}, {
			mode: 'editor'
		})

		const u3 = boundKeyboard([':'], () => {
			openOverlay('cmd', Cmd, {
				height: 2,
				left: 0,
				setChange: () => {
					setEdiFocus(undefined)
				}
			})

			setEdiFocus(false)
		}, {
			mode: 'normal'
		})

		return () => {
			u1()
			u2()
			u3()
		}
	}, [setMode, boundKeyboard])

	return (
		<Box flexDirection="column" padding={1}>
			<Box
				flexGrow={1}
				backgroundColor='blue'
				flexDirection='row'
				paddingLeft={2}
			>
				<Text bold>
					{currentMode}
				</Text>
			</Box>
			<Box
				paddingX={1}
				height='100%'
				width='100%'
				backgroundColor='#1E1E1E'
			>
				<Editor
					focusId="editor-main"
					value={text}
					onChange={setText}
					height={Math.max(1, rows - 5)}
					isFocus={ediIsFocus}
				/>
			</Box>
		</Box>
	);
}

registerComponent(EditorScreen, {});

render(
	<ScenarioManagementProvider defaultScreen={EditorScreen} fullScreen>
		<KeyboardProvider autoTab={false} modes={['normal', 'editor']} defaultMode={'normal'}>
			<CurrentScreen />
		</KeyboardProvider>
	</ScenarioManagementProvider>,
);
