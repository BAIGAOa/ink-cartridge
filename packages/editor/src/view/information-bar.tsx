import { Box, Text } from "ink";
import React from "react";

export type InformationBarProps = {
	mode: string;
	cursor?: { line: number; column: number };
};

/** Status bar: current mode (live) plus the cursor's 1-based position. */
export function InformationBar({ mode, cursor }: InformationBarProps) {
	return (
		<Box
			width="100%"
			height={1}
			backgroundColor="blue"
			flexDirection="row"
			paddingLeft={2}
		>
			<Text color="white" bold>
				{mode}
			</Text>
			{cursor ? (
				<Text color="white">
					{"  "}Ln {cursor.line + 1}, Col {cursor.column + 1}
				</Text>
			) : null}
		</Box>
	);
}
