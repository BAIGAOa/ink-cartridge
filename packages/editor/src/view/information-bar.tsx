import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";
import type { EditorSession } from "../core/session.js";

export type InformationBarProps = {
	mode: string;
	cursor?: { line: number; column: number };
	/** File session: drives the file name, dirty marker, and save messages. */
	session?: EditorSession | null;
};

/**
 * Status bar: current mode, cursor position, and (with a session) the open
 * file name with a dirty marker plus the last save/open result message.
 */
export function InformationBar({ mode, cursor, session = null }: InformationBarProps) {
	// Session changes (file open, save) don't rerender the editor's doc —
	// subscribe here so the right side of the bar stays live.
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		if (!session) {
			return;
		}
		return session.onChange(() => forceUpdate((n) => n + 1));
	}, [session]);

	const dirty = session?.isDirty() ?? false;
	const message = session?.message ?? null;

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
			{session ? (
				<Text color="white">
					{"  "}
					{session.displayName}
					{dirty ? " ●" : ""}
				</Text>
			) : null}
			{message ? (
				<>
					<Box flexGrow={1} />
					<Box marginRight={2}>
						<Text color={message.kind === "error" ? "red" : "green"}>{message.text}</Text>
					</Box>
				</>
			) : null}
		</Box>
	);
}
