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
