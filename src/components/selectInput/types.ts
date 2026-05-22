export interface Item<T> {
  label: string;
  value: T;
}

/**
 * SelectInput props
 */
export interface SelectInputProps<T> {
  isFocus: boolean;
  onSelect: (item: Item<T>) => void;
  items: Item<T>[];
}
