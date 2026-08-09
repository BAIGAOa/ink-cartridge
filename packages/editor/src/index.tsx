#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import {
  CurrentScreen,
  KeyboardProvider,
  LanguageProvider,
  registerComponent,
  ScenarioManagementProvider,
} from "ink-cartridge";
import { resources } from "./i18n-resources.js";
import { settingsStore } from "./core/settings/useSettings.js";
import { MainMenu } from "./view/main-menu.js";
import { Editor } from "./view/editor.js";
import { Settings } from "./view/settings.js";

registerComponent(MainMenu, {});
registerComponent(Editor, {}, { parent: MainMenu });
registerComponent(Settings, {}, { parent: MainMenu });

render(
  <ScenarioManagementProvider defaultScreen={MainMenu} fullScreen>
    <LanguageProvider
      resources={resources}
      defaultLanguage={settingsStore.settings.language}
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
