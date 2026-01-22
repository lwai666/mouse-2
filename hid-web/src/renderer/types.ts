export interface UserModuleContext {
  app: import('vue').App
  isClient: boolean
  initialState?: Record<string, any>
}

export type UserModule = (ctx: UserModuleContext) => void


export interface IResult {
  success: boolean;
  message: string;
}


export type MouseButtonStatus = 'connecting' | 'normal';

export interface ProfileType {
  title: string;
  base64: string;
  uint8Array: Uint8Array[];
  value?: Record<string, any>;
}


export type MouseButtonType = 'Left' | 'Right' | 'Wheel' | 'Forward' | 'Back' | 'dpi'

type MacroValue = {
  keyCode: number // 鼠标按键
  keyStatus: number // 0.按下 | 1.松开
  intervalTime: number // ms
}

export type ConnectionType = {
  keyid: MouseButtonType;
  cycleTimes: number; // 1-4(循环直到此按键松开，循环直到任意按键按下，循环直到此按键再次按下，循环次数模式)
  cycleMode: number; // 双击输入次数
}

export type Macro = {
  name: string;
  connections: ConnectionType[]
  value: MacroValue[];
}

export interface ProfileInfoType {
  [key: string]: any
  macroList: Macro[]
}
