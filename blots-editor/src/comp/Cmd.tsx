import { Box, Text } from "ink";
import React, { useContext, useEffect } from "react";
import {
	registerComponent,
	useKeyboard,
	useScreenSystem,
	OverlayContext,
} from "ink-cartridge";

export interface CmdOptions {
	left: number;
	height: number;
    setChange: () => void
}

function Cmd({ left, height, setChange }: CmdOptions) {
	const { boundKeyboard } = useKeyboard();
	const modalId = useContext(OverlayContext);

	const { closeOverlay } = useScreenSystem();

	useEffect(() => {
		const u1 = boundKeyboard(["escape"], () => {
			if (modalId) {
				closeOverlay(modalId.id);
                setChange()
			}
		});

		return () => {
			u1();
		};
	}, [boundKeyboard, modalId]);

	return (
		<Box
			height={height}
			width="100%"
			flexDirection="column"
			position="absolute"
			left={left}
			bottom={0}
			paddingLeft={1}
			paddingRight={1}
		>
			<Box flexGrow={1} backgroundColor="blue" flexDirection="row" paddingLeft={2}>
				<Text bold>MODAL Cmd</Text>
			</Box>
			<Box flexDirection="row" backgroundColor="#1E1E1E">
				<Text>:</Text>
			</Box>
		</Box>
	);
}

registerComponent(Cmd, {
	height: 1,
	left: 0,
    setChange: () => {}
});

export default Cmd;
