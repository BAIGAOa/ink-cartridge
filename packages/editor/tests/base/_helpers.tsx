import React from "react";
import { render } from "ink-testing-library";
import { vi } from "vitest";
import {
	CurrentScreen,
	KeyboardProvider,
	LanguageProvider,
	ScenarioManagementProvider,
} from "ink-cartridge";
import { resources } from "../../src/i18n-resources.js";

export function stripAnsi(str: string | undefined): string {
	return (str ?? "").replace(/\x1b\[[0-9;]*m/g, "");
}

export async function flush(): Promise<void> {
	await new Promise((r) => setTimeout(r, 50));
}

export async function press(
	stdin: { write: (data: string) => void },
	key: string,
): Promise<void> {
	const { act } = await import("react");
	await act(async () => {
		stdin.write(key);
	});
}

/** Render a registered screen with the full provider chain the app uses. */
export function renderApp(defaultScreen: React.ComponentType) {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	return render(
		<ScenarioManagementProvider defaultScreen={defaultScreen} fullScreen>
			<LanguageProvider
				resources={resources}
				defaultLanguage="en"
				fallbackLanguage="en"
			>
				<KeyboardProvider
					autoTab={false}
					mouse
					modes={["insert", "normal"]}
					defaultMode="insert"
				>
					<CurrentScreen />
				</KeyboardProvider>
			</LanguageProvider>
		</ScenarioManagementProvider>,
	);
}
