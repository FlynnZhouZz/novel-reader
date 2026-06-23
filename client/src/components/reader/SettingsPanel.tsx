'use client';

import { Drawer, Button, Radio, Slider, Switch, Divider, RadioChangeEvent } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  BlockOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { updateSettings, setShowSettings } from '@/store/slices/readerSlice';
import { ReaderSettings, FlipMode } from '@/types';

// 背景颜色预设
const backgroundColors = [
  { name: '默认', backgroundColor: '#FFFFFF', textColor: '#333333' },
  { name: '护眼', backgroundColor: '#C7EDCC', textColor: '#333333' },
  { name: '牛皮纸', backgroundColor: '#F5E6C8', textColor: '#333333' },
  { name: '粉色', backgroundColor: '#FFDCE5', textColor: '#333333' },
  { name: '深色', backgroundColor: '#1A1A1A', textColor: '#CCCCCC' },
];

// 字体大小档位
const fontSizes = [14, 16, 18, 20, 24];

export default function SettingsPanel() {
  const dispatch = useAppDispatch();
  const { settings, showSettings } = useAppSelector((state) => state.reader);

  const handleBackgroundColorChange = (bg: string, textColor: string) => {
    dispatch(updateSettings({ backgroundColor: bg, textColor }));
  };

  const handleFontSizeChange = (value: number) => {
    dispatch(updateSettings({ fontSize: value }));
  };

  const handleDarkModeChange = (checked: boolean) => {
    if (checked) {
      dispatch(updateSettings({ darkMode: true, backgroundColor: '#1A1A1A', textColor: '#CCCCCC' }));
    } else {
      dispatch(updateSettings({ darkMode: false, backgroundColor: '#FFFFFF', textColor: '#333333' }));
    }
  };

  const handleFlipModeChange = (e: RadioChangeEvent) => {
    dispatch(updateSettings({ flipMode: e.target.value as FlipMode }));
  };

  const handleAutoReadSpeedChange = (value: number) => {
    dispatch(updateSettings({ autoReadSpeed: value }));
  };

  return (
    <Drawer
      title="阅读设置"
      placement="right"
      onClose={() => dispatch(setShowSettings(false))}
      open={showSettings}
      width={300}
    >
      {/* 背景颜色 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>背景颜色</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {backgroundColors.map((item) => (
            <div
              key={item.name}
              onClick={() => handleBackgroundColorChange(item.backgroundColor, item.textColor)}
              style={{
                width: '40px',
                height: '40px',
                background: item.backgroundColor,
                border: settings.backgroundColor === item.backgroundColor ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: item.textColor,
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* 字体大小 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>字体大小</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {fontSizes.map((size) => (
            <Button
              key={size}
              size="small"
              type={settings.fontSize === size ? 'primary' : 'default'}
              onClick={() => handleFontSizeChange(size)}
            >
              {size}px
            </Button>
          ))}
        </div>
      </div>

      <Divider />

      {/* 暗黑模式 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>暗黑模式</h4>
        <Switch
          checked={settings.darkMode}
          onChange={handleDarkModeChange}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </div>

      <Divider />

      {/* 翻页模式 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>翻页模式</h4>
        <Radio.Group value={settings.flipMode} onChange={handleFlipModeChange}>
          <Radio value="scroll" style={{ display: 'block', marginBottom: '8px' }}>
            <ArrowUpOutlined /> 上下翻页
          </Radio>
          <Radio value="slide" style={{ display: 'block', marginBottom: '8px' }}>
            <ArrowRightOutlined /> 平移翻页
          </Radio>
          <Radio value="cover" style={{ display: 'block', marginBottom: '8px' }}>
            <BlockOutlined /> 覆盖翻页
          </Radio>
          <Radio value="realistic" style={{ display: 'block' }}>
            <BookOutlined /> 仿真翻页
          </Radio>
        </Radio.Group>
      </div>

      <Divider />

      {/* 自动阅读速度 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>自动阅读速度</h4>
        <Slider
          min={1}
          max={10}
          value={settings.autoReadSpeed}
          onChange={handleAutoReadSpeedChange}
          marks={{ 1: '慢', 5: '中', 10: '快' }}
        />
      </div>
    </Drawer>
  );
}
