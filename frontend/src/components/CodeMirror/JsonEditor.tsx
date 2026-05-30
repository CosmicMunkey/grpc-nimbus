import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { useMemo } from 'react';
import { buildCodeMirrorTheme } from '../../codeMirrorTheme';
import { useAppStore } from '../../store/appStore';

type JsonEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  basicSetup?: {
    lineNumbers?: boolean;
    foldGutter?: boolean;
    autocompletion?: boolean;
  };
};

export default function JsonEditor({
  value,
  onChange,
  readOnly,
  className,
  basicSetup,
}: JsonEditorProps) {
  const activeThemeTokens = useAppStore((s) => s.activeThemeTokens);
  const theme = useMemo(() => buildCodeMirrorTheme(activeThemeTokens), [activeThemeTokens]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={theme}
      extensions={[json()]}
      readOnly={readOnly}
      className={className}
      basicSetup={basicSetup}
    />
  );
}
