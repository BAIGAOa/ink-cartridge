import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { LanguageProvider, useI18n } from '../../language/index.js';

const TMP_DIR = resolve('src/__tests__/components/__locales_tmp');

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function T({ k, p }: { k: string; p?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <Text>{t(k, p)}</Text>;
}

function CurrentLang() {
  const { currentLanguage } = useI18n();
  return <Text>{currentLanguage}</Text>;
}

function writeLocales(files: Record<string, object>) {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(resolve(TMP_DIR, name), JSON.stringify(content));
  }
}

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('resources 模式基本翻译', () => {
  it('简单键翻译', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { hello: 'Hello' } }} defaultLanguage="en-US">
        <T k="hello" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Hello');
  });

  it('参数插值', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { level: 'Level {n}' } }} defaultLanguage="en-US">
        <T k="level" p={{ n: 5 }} />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Level 5');
  });

  it('多个参数插值', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { info: '{name} aged {age}' } }} defaultLanguage="en-US">
        <T k="info" p={{ name: 'Alice', age: '30' }} />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Alice aged 30');
  });

  it('缺失参数保留占位符', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { greet: 'Hi {name}' } }} defaultLanguage="en-US">
        <T k="greet" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Hi {name}');
  });

  it('缺失 key 返回 key 本身', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { a: 'A' } }} defaultLanguage="en-US">
        <T k="nonexistent" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('nonexistent');
  });
});

describe('嵌套 key 和 fallback', () => {
  it('嵌套 JSON 通过点号访问', () => {
    const { lastFrame } = render(
      <LanguageProvider
        resources={{ 'en-US': { menu: { title: 'Main', sub: 'Sub' } } }}
        defaultLanguage="en-US"
      >
        <T k="menu.title" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Main');
  });

  it('fallbackLanguage 在缺 key 时生效', () => {
    const { lastFrame } = render(
      <LanguageProvider
        resources={{
          'en-US': { hello: 'Hello' },
          'zh-CN': { bye: '再见' },
        }}
        defaultLanguage="zh-CN"
        fallbackLanguage="en-US"
      >
        <T k="hello" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Hello');
  });

  it('fallback 也缺 key 返回 key 本身', () => {
    const { lastFrame } = render(
      <LanguageProvider
        resources={{ 'en-US': { a: 'A' }, 'zh-CN': { a: '啊' } }}
        defaultLanguage="zh-CN"
        fallbackLanguage="en-US"
      >
        <T k="missing" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('missing');
  });
});

describe('语言切换', () => {
  it('setLanguage 切换后 t() 实时更新', async () => {
    function Switch() {
      const { t, setLanguage } = useI18n();
      useEffect(() => { setLanguage('zh-CN'); }, []);
      return <Text>{t('hello')}</Text>;
    }
    const { lastFrame } = render(
      <LanguageProvider
        resources={{ 'en-US': { hello: 'Hello' }, 'zh-CN': { hello: '你好' } }}
        defaultLanguage="en-US"
      >
        <Switch />
      </LanguageProvider>,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(stripAnsi(lastFrame())).toContain('你好');
  });

  it('setLanguage 切换不存在的语言抛错', async () => {
    function Switch() {
      const { setLanguage } = useI18n();
      const [err, setErr] = React.useState<string | null>(null);
      useEffect(() => {
        try { setLanguage('fr-FR'); } catch (e: any) { setErr(e.message); }
      }, []);
      if (err) return <Text>{err}</Text>;
      return <Text>ok</Text>;
    }
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { hello: 'Hello' } }} defaultLanguage="en-US">
        <Switch />
      </LanguageProvider>,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(stripAnsi(lastFrame())).toContain('[Ink-Router-Kit]');
    expect(stripAnsi(lastFrame())).toContain('en-US');
  });
});

describe('getLanguages 和 currentLanguage', () => {
  it('getLanguages 返回所有可用语言', () => {
    function List() {
      const { getLanguages } = useI18n();
      return <Text>{getLanguages().join(',')}</Text>;
    }
    const { lastFrame } = render(
      <LanguageProvider
        resources={{ 'en-US': { a: 'A' }, 'zh-CN': { a: '啊' }, 'ja-JP': { a: 'あ' } }}
        defaultLanguage="en-US"
      >
        <List />
      </LanguageProvider>,
    );
    const out = stripAnsi(lastFrame());
    expect(out).toContain('en-US');
    expect(out).toContain('zh-CN');
    expect(out).toContain('ja-JP');
  });

  it('currentLanguage 返回当前语言', () => {
    const { lastFrame } = render(
      <LanguageProvider resources={{ 'en-US': { a: 'A' } }} defaultLanguage="en-US">
        <CurrentLang />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('en-US');
  });
});

describe('path 模式', () => {
  it('从目录加载 JSON 翻译文件', () => {
    writeLocales({
      'en-US.json': { hello: 'Hello from file' },
      'zh-CN.json': { hello: '来自文件' },
    });

    const { lastFrame } = render(
      <LanguageProvider path={TMP_DIR} defaultLanguage="zh-CN">
        <T k="hello" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('来自文件');
  });

  it('目录不存在时抛框架错误', () => {
    const { lastFrame } = render(
      <ErrorCatcher>
        <LanguageProvider path="/nonexistent/path/12345">
          <T k="x" />
        </LanguageProvider>
      </ErrorCatcher>,
    );
    expect(stripAnsi(lastFrame())).toContain('[Ink-Router-Kit]');
  });
});

describe('JSON 值类型处理', () => {
  it('数字转为字符串', () => {
    writeLocales({ 'en-US.json': { count: 42 } });
    const { lastFrame } = render(
      <LanguageProvider path={TMP_DIR} defaultLanguage="en-US">
        <T k="count" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('42');
  });

  it('布尔转为字符串', () => {
    writeLocales({ 'en-US.json': { active: true, inactive: false } });
    const { lastFrame } = render(
      <LanguageProvider path={TMP_DIR} defaultLanguage="en-US">
        <T k="active" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('true');
  });

  it('数组转为逗号分隔字符串', () => {
    writeLocales({ 'en-US.json': { items: ['a', 'b', 'c'] } });
    const { lastFrame } = render(
      <LanguageProvider path={TMP_DIR} defaultLanguage="en-US">
        <T k="items" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('a, b, c');
  });
});

describe('无资源回退', () => {
  it('无任何资源时 t() 返回 key 本身', () => {
    const { lastFrame } = render(
      <LanguageProvider>
        <T k="hello" />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('hello');
  });

  it('无资源时 getLanguages 返回空数组', () => {
    function Empty() {
      const { getLanguages } = useI18n();
      return <Text>{String(getLanguages().length)}</Text>;
    }
    const { lastFrame } = render(
      <LanguageProvider>
        <Empty />
      </LanguageProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('0');
  });
});

describe('useI18n 不在 Provider 内', () => {
  it('抛带框架前缀的错误', () => {
    const { lastFrame } = render(
      <ErrorCatcher>
        <Bad />
      </ErrorCatcher>,
    );
    expect(stripAnsi(lastFrame())).toContain('[Ink-Router-Kit]');
  });
});

class ErrorCatcher extends React.Component<
  { children: React.ReactNode },
  { err: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { err: error.message };
  }
  render() {
    if (this.state.err) return <Text>{this.state.err}</Text>;
    return <>{this.props.children}</>;
  }
}

function Bad() {
  useI18n();
  return <Text>nope</Text>;
}
