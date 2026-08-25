## 使用 `skip` , `gotoScreen` , `back` 方法切换页面

我们已经了解到了如何使用 `registerComponent` 组织屏幕结构，但如果我们想要做到真正的屏幕切换则需要配合绑定方法使用，例如 `boundKeyboard`。

导航方法包括三个核心方法，它们都通过 `useScreenSystem` 钩子获取，通常配合 `boundKeyboard` 等方法使用。

### 使用 `skip` 方法切换屏幕

当你需要切换到当前屏幕的直接子屏幕时，你可以使用 `skip` 方法，举个例子，假设你的应用的根屏幕为 Menu ，而 Game 声明了它的 parent 为 Menu ，因此可以使用 `skip` 方法跳转屏幕。
如果你因为某些原因而使你必须跳转到非直接子屏幕，那 `skip` 方法不适用于这种场景，如果你强制这么做的话，`skip` 会报出错误 **xxx is not a child of xxx. Use skip to navigate down the tree, or gotoScreen to jump across branches.**

以下为适用于 `skip` 方法的场景。
```tsx
// 假设 Main 屏幕为根界面
registerComponent(Main, {})

// 此时 Game 屏幕为 Main 屏幕的直接子屏幕
registerComponent(Game, {}, { parent: Main })

```

因此，Main 组件内部可以直接使用 `skip` 方法跳转到 Game 屏幕。
```tsx
function Main() {
	const { skip } = useScreenSystem()
	const { boundKeyboard } = useKeyboard()

	useEffect(() => {
		// 这样的话，在 Main 屏幕的时候，按下 s 键则会跳转到 Game 屏幕
		return boundKeyboard(["s"], () => skip(Game, {}))
	}, [boundKeyboard, skip])

	return (
		...
	)
}
```

而以下场景中不可以使用 `skip` 方法跳转屏幕。
```tsx
// 此时，Main 为根屏幕
registerComponent(Main, {})

// Game 作为 Main 的直接子屏幕
registerComponent(Game, {}, { parent: Main })

// Settings 也为 Main 的直接子屏幕，这样的话 Settings 与 Game 是兄弟关系而不是直接的父子关系
registerComponent(Settings, {}, { parent: Main })
```

此时在 Game 组件体内直接调用 `skip` 方法跳转到 Settings 时，会直接产生报错（报错信息见上面）。
```tsx
function Game() {
	const { skip } = useScreenSystem()
	const { boundKeyboard } = useKeyboard()

	useEffect(() => {
		// 错误，skip 方法只能跳转直接子屏幕，不能跳转兄弟屏幕
		return boundKeyboard(["s"], () => skip(Settings, {}))
	}, [boundKeyboard, skip])

	return (
		...
	)
}
```

`skip` 方法也不能跳转到父屏幕。
```tsx
function Game() {
	const { skip } = useScreenSystem()
	const { boundKeyboard } = useKeyboard()

	useEffect(() => {
		// 错误，skip 方法只能跳转到直接子屏幕
		return boundKeyboard(["b"], () => skip(Main, {}))
	}, [boundKeyboard, skip])

	return (
		...
	)
}
```
#### 使用 `skip` 来传递属性

`skip` 的第二个参数用来传递目标屏幕的属性。`skip` 会把传进去的属性与屏幕注册时的模板进行合并。例如下面的片段代码，展示了如何使用 `skip` 方法传递属性。
```tsx
// 声明一个 Game 组件，它的属性需要一个 playerName
function Game({ playerName }: { playerName: string }) {
	...
	return (
		<Box>
			<Text>
				{playerName}
			</Text>
		</Box>
	)
}
```
若我们有一个根屏幕 Menu ，而 Game 屏幕是 Menu 的直接子屏幕，我们就可以使用 `skip` 方法，并在跳转的时候传递属性。
```tsx
function Menu() {
	const { skip } = useScreenSystem()
	const { boundKeyboard } = useKeyboard()

	useEffect(() => {
		// 按下 s 键后，即进入了 Game 屏幕，并且 Game 屏幕显示了 "default" 字样，若传递其他任意字符串，那显示的就是那个字符串
		return boundKeyboard(["s"], () => skip(Game, { playerName: "default" }))
	}, [boundKeyboard, skip])

	return (
		...
	)
}
```
你可以使用它传递任意数据

#### 使用 `skip` 来刷新当前屏幕

有时候，我们需要刷新当前屏幕并且更新一些属性状态，`skip` 提供了一个特殊的参数，让你可以更新屏幕内的状态。你可以使用 `skip` 方法的 `onlyAttribute` 选项来控制这一行为。前提是 `skip` 第一个参数的跳转目标必须为当前所在的屏幕。通常来说，你可以使用第二个参数传递新的属性来改变状态，而 `onlyAttribute` 选项只控制是否重新刷新屏幕。例如下例代码片段。

::: Note
`skip` 在使用 `onlyAttribute` 的时候当前屏幕也必须为已注册的。
:::

```tsx
function Game({ text }: { text: string }) {
	const { skip } = useScreenSystem()
	const { boundKeyboard } = useKeyboard()

	useEffect(() => {
		// 此时按下 r 键即可看见屏幕上显示了 "游戏已刷新 "
		return boundKeyboard(["r"], () => skip(Game, { text: "游戏已刷新" }, { onlyAttribute: true }))
	}, [boundKeyboard, skip])

	return (
		<Box>
			<Text>
				{text}
			</Text>
		</Box>
	)
}
```
