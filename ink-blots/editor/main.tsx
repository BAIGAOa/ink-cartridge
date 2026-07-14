/**
 * Markdown Editor — multi-line text editor built on ink-cartridge.
 *
 * Run:
 *   npx tsx ink-blots/editor/main.tsx
 */
import React, { useEffect, useState } from 'react';
import { render, Box, useWindowSize, Text } from 'ink';
import {
	registerComponent,
	ScenarioManagementProvider,
	CurrentScreen,
	KeyboardProvider,
	useKeyboard,
} from '../../src/index.js';
import Editor from './comp/Editor.js';


function EditorScreen() {
	const [text, setText] = useState('');
	const [currentMode, setCurrentMode] = useState('normal');
	const { rows } = useWindowSize();
	const { setMode, boundKeyboard } = useKeyboard()

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

		return () => {
			u1()
			u2()
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
				marginTop={1}
				borderStyle="round"
				borderColor="white"
				paddingX={1}
				height='100%'
				width='100%'
				backgroundColor='black'
				flexGrow={10}
			>
				<Editor
					focusId="editor-main"
					value={text}
					onChange={setText}
					height={Math.max(1, rows - 7)}
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
