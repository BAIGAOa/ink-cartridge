import React, { useEffect, useState } from 'react'
import { SelectInputProps } from './types.js';
import { useKeyboard } from '../../keyboard/hook.js';
import { Box, Text } from 'ink';


export default function SelectInput<T>(props: SelectInputProps<T>) {
  const [index, setIndex] = useState<number>(0)
  const { boundKeyboard } = useKeyboard()

  const upOperate = () => {
    setIndex(i => (i === 0 ? props.items.length - 1 : i - 1))
  }

  const downOperate = () => {
    setIndex(i => (i === props.items.length - 1 ? 0 : i + 1))
  }

  useEffect(() => {
    if (!props.isFocus) return
    const u1 = boundKeyboard(['up'], upOperate, {
      onlyThis: true
    })

    const u2 = boundKeyboard(['down'], downOperate, {
      onlyThis: true
    })

    const u3 = boundKeyboard(['return'], () => {
      const item = props.items[index]
      props.onSelect(item)
    })

    return () => { u1(), u2(), u3() }
  }, [props.isFocus])

  return (
    <Box flexDirection='column'>
      {
        props.items.map((item, i) => {
          return (
            <Text
              key={String(item.value)}
              color={i === index ? 'cyan' : undefined}
            >
              {i === index ? '❯ ' : '  '}
              {item.label}
            </Text>
          )
        })
      }
    </Box>
  )
}
