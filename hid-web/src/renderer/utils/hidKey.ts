
type KeyItem = {
  value: number
  text: string
  type: number
}

type KeyMap = Record<string, KeyItem>

export const keyMap: KeyMap = {
  'Escape': {
    value : 0x29,
    text : "Esc",
    type : 0,
  },
  'F1': {
    value : 0x3A,
    text : "F1",
    type : 0,
  },
  'F2': {
    value : 0x3B,
    text : "F2",
    type : 0,
  },
  'F3': {
    value : 0x3C,
    text : "F3",
    type : 0,
  },
  'F4': {
    value : 0x3D,
    text : "F4",
    type : 0,
  },
  'F5': {
    value : 0x3E,
    text : "F5",
    type : 0,
  },
  'F6': {
    value : 0x3F,
    text : "F6",
    type : 0,
  },
  'F7': {
    value : 0x40,
    text : "F7",
    type : 0,
  },
  'F8': {
    value : 0x41,
    text : "F8",
    type : 0,
  },
  'F9': {
    value : 0x42,
    text : "F9",
    type : 0,
  },
  'F10': {
    value : 0x43,
    text : "F10",
    type : 0,
  },
  'F11': {
    value : 0x44,
    text : "F11",
    type : 0,
  },
  'F12': {
    value : 0x45,
    text : "F12",
    type : 0,
  },


  'Backquote': {
    value : 0x35,
    text : "`",
    type : 0,
  },
  'Digit1': {
    value : 0x1E,
    text : "1",
    type : 0,
  },
  'Digit2': {
    value : 0x1F,
    text : "2",
    type : 0,
  },
  'Digit3': {
    value : 0x20,
    text : "3",
    type : 0,
  },
  'Digit4': {
    value : 0x21,
    text : "4",
    type : 0,
  },
  'Digit5': {
    value : 0x22,
    text : "5",
    type : 0,
  },
  'Digit6': {
    value : 0x23,
    text : "6",
    type : 0,
  },
  'Digit7': {
    value : 0x24,
    text : "7",
    type : 0,
  },
  'Digit8': {
    value : 0x25,
    text : "8",
    type : 0,
  },
  'Digit9': {
    value : 0x26,
    text : "9",
    type : 0,
  },
  'Digit0': {
    value : 0x27,
    text : "0",
    type : 0,
  },
  'Minus': {
    value : 0x2D,
    text : "-",
    type : 0,
  },
  'Equal': {
    value : 0x2E,
    text : "+",
    type : 0,
  },
  'Backspace': {
    value : 0x2A,
    text : "←",
    type : 0,
  },

  'Tab': {
    value : 0x2B,
    text : "Tab",
    type : 0,
  },
  'KeyQ': {
    value : 0x14,
    text : "Q",
    type : 0,
  },
  'KeyW': {
    value : 0x1A,
    text : "W",
    type : 0,
  },
  'KeyE': {
    value : 0x08,
    text : "E",
    type : 0,
  },
  'KeyR': {
    value : 0x15,
    text : "R",
    type : 0,
  },
  'KeyT': {
    value : 0x17,
    text : "T",
    type : 0,
  },
  'KeyY': {
    value : 0x1C,
    text : "Y",
    type : 0,
  },
  'KeyU': {
    value : 0x18,
    text : "U",
    type : 0,
  },
  'KeyI': {
    value : 0x0C,
    text : "I",
    type : 0,
  },
  'KeyO': {
    value : 0x12,
    text : "O",
    type : 0,
  },
  'KeyP': {
    value : 0x13,
    text : "P",
    type : 0,
  },
  'BracketLeft': {
    value : 0x2F,
    text : "[",
    type : 0,
  },
  'BracketRight': {
    value : 0x30,
    text : "]",
    type : 0,
  },
  'Backslash': {
    value : 0x31,
    text : "]",
    type : 0,
  },


  'CapsLock': {
    value : 0x39,
    text : "CapsLock",
    type : 0,
  },
  'KeyA': {
    value : 0x04,
    text : "A",
    type : 0,
  },
  'KeyS': {
    value : 0x16,
    text : "S",
    type : 0,
  },
  'KeyD': {
    value : 0x07,
    text : "D",
    type : 0,
  },
  'KeyF': {
    value : 0x09,
    text : "F",
    type : 0,
  },
  'KeyG': {
    value : 0x0A,
    text : "G",
    type : 0,
  },
  'KeyH': {
    value : 0x0B,
    text : "H",
    type : 0,
  },
  'KeyJ': {
    value : 0x0D,
    text : "J",
    type : 0,
  },
  'KeyK': {
    value : 0x0E,
    text : "K",
    type : 0,
  },
  'KeyL': {
    value : 0x0F,
    text : "L",
    type : 0,
  },
  'Semicolon': {
    value : 0x33,
    text : ":",
    type : 0,
  },
  'Quote': {
    value : 0x34,
    text : "'",
    type : 0,
  },
  'Enter': {
    value : 0x28,
    text : "Enter",
    type : 0,
  },


  'ShiftLeft': {
    value : 0x02,
    text : "LShift",
    type : 1,
  },
  'KeyZ': {
    value : 0x1D,
    text : "Z",
    type : 0,
  },
  'KeyX': {
    value : 0x1B,
    text : "X",
    type : 0,
  },
  'KeyC': {
    value : 0x06,
    text : "C",
    type : 0,
  },
  'KeyV': {
    value : 0x19,
    text : "V",
    type : 0,
  },
  'KeyB': {
    value : 0x05,
    text : "B",
    type : 0,
  },
  'KeyN': {
    value : 0x11,
    text : "N",
    type : 0,
  },
  'KeyM': {
    value : 0x10,
    text : "M",
    type : 0,
  },
  'Comma': {
    value : 0x36,
    text : ",",
    type : 0,
  },
  'Period': {
    value : 0x37,
    text : ".",
    type : 0,
  },
  'Slash': {
    value : 0x38,
    text : "/",
    type : 0,
  },
  'ShiftRight': {
    value : 0x20,
    text : "RShift",
    type : 1,
  },



  'ControlLeft': {
    value : 0x01,
    text : "LCtrl",
    type : 1,
  },
  'MetaLeft': {
    value : 0x08,
    text : "LWin",
    type : 1,
  },
  'AltLeft': {
    value : 0x04,
    text : "LAlt",
    type : 1,
  },
  'Space': {
    value : 0x2C,
    text : "Space",
    type : 0,
  },
  'AltRight': {
    value : 0x40,
    text : "RAlt",
    type : 1,
  },
  'MetaRight': {
    value : 0x80,
    text : "RWin",
    type : 1,
  },
  'ContextMenu': {
    value : 0x01,
    text : "FN",
    type : 1,
  },
  'ControlRight': {
    value : 0x10,
    text : "RCtrl",
    type : 1,
  },
  'PrintScreen': {
    value : 0x46,
    text : "Screen",
    type : 0,
  },
  'ScrollLock': {
    value : 0x47,
    text : "Scroll",
    type : 0,
  },
  'Pause': {
    value : 0x48,
    text : "Pause",
    type : 0,
  },
  'Insert': {
    value : 0x49,
    text : "Insert",
    type : 0,
  },
  'Home': {
    value : 0x4A,
    text : "Home",
    type : 0,
  },
  'PageUp': {
    value : 0x4B,
    text : "PageUp",
    type : 0,
  },
  'Delete': {
    value : 0x4C,
    text : "Del",
    type : 0,
  },
  'End': {
    value : 0x4D,
    text : "End",
    type : 0,
  },
  'PageDown': {
    value : 0x4E,
    text : "PageDn",
    type : 0,
  },
  'ArrowUp': {
    value : 0x52,
    text : "↑",
    type : 0,
  },
  'ArrowLeft': {
    value : 0x50,
    text : "←",
    type : 0,
  },
  'ArrowDown': {
    value : 0x51,
    text : "↓",
    type : 0,
  },
  'ArrowRight': {
    value : 0x4F,
    text : "→",
    type : 0,
  },


  'NumLock': {
    value : 0x53,
    text : "NumLock",
    type : 0,
  },
  'NumpadDivide': {
    value : 0x54,
    text : "Num/",
    type : 0,
  },
  'NumpadMultiply': {
    value : 0x55,
    text : "Num*",
    type : 0,
  },
  'NumpadSubtract': {
    value : 0x56,
    text : "Num-",
    type : 0,
  },
  'NumpadAdd': {
    value : 0x57,
    text : "Num+",
    type : 0,
  },
  'NumpadDecimal': {
    value : 0x63,
    text : "Num.",
    type : 0,
  },
  'NumpadEnter': {
    value : 0x58,
    text : "Enter",
    type : 0,
  },
  'Numpad1': {
    value : 0x59,
    text : "Num1",
    type : 0,
  },
  'Numpad2': {
    value : 0x5A,
    text : "Num2",
    type : 0,
  },
  'Numpad3': {
    value : 0x5B,
    text : "Num3",
    type : 0,
  },
  'Numpad4': {
    value : 0x5C,
    text : "Num4",
    type : 0,
  },
  'Numpad5': {
    value : 0x5D,
    text : "Num5",
    type : 0,
  },
  'Numpad6': {
    value : 0x5E,
    text : "Num6",
    type : 0,
  },
  'Numpad7': {
    value : 0x5F,
    text : "Num7",
    type : 0,
  },
  'Numpad8': {
    value : 0x60,
    text : "Num8",
    type : 0,
  },
  'Numpad9': {
    value : 0x61,
    text : "Num9",
    type : 0,
  },
  'Numpad0': {
    value : 0x62,
    text : "Num0",
    type : 0,
  },
}

export function keyToHID(key: string) {
  return keyMap[key] || null;
}

export function HIDToKey(context: KeyItem) {
  for(let key in keyMap) {
    if((keyMap[key].type == context.type) &&
       (keyMap[key].value == context.value))
    {
      return keyMap[key];
    }
  }

  return null;
}

export function textToHID(text: string) {
  for(let key in keyMap) {
    if(keyMap[key].text == text)
    {
      return keyMap[key];
    }
  }

  return null;
}

export default {
  keyToHID,
  HIDToKey,
  textToHID,
}
