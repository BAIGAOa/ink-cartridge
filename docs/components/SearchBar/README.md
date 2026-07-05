# SearchBar

Search-as-you-type bar with a pluggable results pane. Uses `TextInput` for the search field and delegates result display + selection to a `selectBar` component (e.g. `SelectInput`). Enter moves focus from the input to the results list; confirming a selection fires `onSubmit` and returns focus to the input.
