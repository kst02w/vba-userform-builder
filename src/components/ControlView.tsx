import type { CSSProperties } from 'react'
import type { ControlBase } from '../types/project'

export function ControlView({ control }: { control: ControlBase }) {
  const baseStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    fontFamily: control.fontName ?? 'inherit',
    fontSize: control.fontSize ? `${control.fontSize}pt` : undefined,
    fontWeight: control.fontBold ? 'bold' : 'normal',
    fontStyle: control.fontItalic ? 'italic' : 'normal',
    textDecoration: control.fontUnderline ? 'underline' : undefined,
    color: control.foreColor,
    background:
      control.backColor === 'transparent' ? 'transparent' : control.backColor,
    opacity: control.visible === false ? 0.3 : control.enabled === false ? 0.6 : 1,
    overflow: 'hidden',
    userSelect: 'none',
    pointerEvents: 'none', // selection/drag handled by overlay
    boxSizing: 'border-box',
  }
  const borderStyle: CSSProperties =
    control.borderStyle === 'single'
      ? { border: `1px solid ${control.borderColor ?? '#7F7F7F'}` }
      : {}

  switch (control.type) {
    case 'Label':
      return (
        <div style={{ ...baseStyle, ...borderStyle, padding: '0 1px' }}>
          {control.caption}
        </div>
      )

    case 'TextBox':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            padding: '1px 3px',
            background: control.backColor ?? '#FFFFFF',
            whiteSpace: control.multiLine ? 'pre-wrap' : 'nowrap',
          }}
        >
          {control.passwordChar
            ? (control.text as string)?.replace(/./g, control.passwordChar)
            : (control.text as string) ?? ''}
        </div>
      )

    case 'CommandButton':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #ADADAD',
            background:
              control.backColor === 'transparent' ? '#F0F0F0' : control.backColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
          }}
        >
          {control.caption}
        </div>
      )

    case 'ToggleButton':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #ADADAD',
            background: control.value
              ? '#C8E0F0'
              : control.backColor === 'transparent'
                ? '#F0F0F0'
                : control.backColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: control.value
              ? 'inset 1px 1px 0 rgba(0,0,0,0.15)'
              : undefined,
          }}
        >
          {control.caption}
        </div>
      )

    case 'ComboBox':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            background: control.backColor ?? '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ flex: 1, padding: '0 3px' }}>
            {(control.text as string) ?? ''}
          </span>
          <span
            style={{
              width: 16,
              height: '100%',
              borderLeft: '1px solid #7F7F7F',
              background: '#F0F0F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ▾
          </span>
        </div>
      )

    case 'ListBox':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            background: control.backColor ?? '#FFFFFF',
            padding: '1px',
          }}
        >
          {(control.listItems as string[])?.map((it, i) => (
            <div key={i} style={{ padding: '0 3px' }}>
              {it}
            </div>
          ))}
        </div>
      )

    case 'CheckBox':
      return (
        <div
          style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              border: '1px solid #7F7F7F',
              background: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {control.value ? '✓' : ''}
          </span>
          <span>{control.caption}</span>
        </div>
      )

    case 'OptionButton':
      return (
        <div
          style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '1px solid #7F7F7F',
              background: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {control.value && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#000',
                }}
              />
            )}
          </span>
          <span>{control.caption}</span>
        </div>
      )

    case 'Frame':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            position: 'relative',
            paddingTop: 8,
          }}
        >
          {control.caption && (
            <span
              style={{
                position: 'absolute',
                top: -8,
                left: 6,
                background: '#F0F0F0',
                padding: '0 4px',
                fontSize: control.fontSize ? `${control.fontSize}pt` : '9pt',
              }}
            >
              {control.caption}
            </span>
          )}
        </div>
      )

    case 'Image':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            background: control.backColor ?? '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 10,
          }}
        >
          {control.picture ? (
            <img
              src={control.picture as string}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit:
                  control.pictureSizeMode === 'stretch'
                    ? 'fill'
                    : control.pictureSizeMode === 'zoom'
                      ? 'contain'
                      : 'none',
              }}
            />
          ) : (
            'Image'
          )}
        </div>
      )

    case 'MultiPage':
    case 'TabStrip':
      return (
        <div
          style={{
            ...baseStyle,
            border: '1px solid #7F7F7F',
            background: control.backColor ?? '#F0F0F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #7F7F7F',
              background: '#E8E8E8',
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                background: '#F0F0F0',
                borderRight: '1px solid #7F7F7F',
              }}
            >
              Page1
            </span>
            <span style={{ padding: '2px 8px' }}>Page2</span>
          </div>
        </div>
      )

    case 'ScrollBar':
      return (
        <div
          style={{
            ...baseStyle,
            background: '#E0E0E0',
            border: '1px solid #ADADAD',
            display: 'flex',
            flexDirection: control.width > control.height ? 'row' : 'column',
          }}
        >
          <span
            style={{
              width: control.width > control.height ? 16 : '100%',
              height: control.width > control.height ? '100%' : 16,
              background: '#F0F0F0',
              borderRight:
                control.width > control.height ? '1px solid #ADADAD' : undefined,
              borderBottom:
                control.width > control.height ? undefined : '1px solid #ADADAD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            {control.width > control.height ? '◀' : '▲'}
          </span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              width: control.width > control.height ? 16 : '100%',
              height: control.width > control.height ? '100%' : 16,
              background: '#F0F0F0',
              borderLeft:
                control.width > control.height ? '1px solid #ADADAD' : undefined,
              borderTop:
                control.width > control.height ? undefined : '1px solid #ADADAD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            {control.width > control.height ? '▶' : '▼'}
          </span>
        </div>
      )

    case 'SpinButton':
      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #ADADAD',
          }}
        >
          <span
            style={{
              flex: 1,
              background: '#F0F0F0',
              borderBottom: '1px solid #ADADAD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            ▲
          </span>
          <span
            style={{
              flex: 1,
              background: '#F0F0F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            ▼
          </span>
        </div>
      )

    default:
      return null
  }
}
