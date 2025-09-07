interface Option {
  value: number
  label: string
  children?: Option[]
}

export function findParentValue(options: Option[], targetValue: number): number | undefined {
  for (const option of options) {
    if (option.children) {
      for (const child of option.children) {
        if (child.value === targetValue) {
          return option.value // 返回父级 value
        }
      }
      // 递归查找子级
      const parentValue = findParentValue(option.children, targetValue)
      if (parentValue !== undefined) {
        return parentValue
      }
    }
  }
  return undefined // 如果找不到父级，返回 false
}

export function useConstants(t: any) {
  return {
    mouseKeyOptions: [
      // {
      //   "value": "8",
      //   "label": t('mouseKeyOptions.switch_polling_rate'),
      // },
      {
        value: 11,
        label: t('mouseKeyOptions.disable'),
      },
      {
        value: 0,
        label: t('mouseKeyOptions.left_button'),
      },
      {
        value: 2,
        label: t('mouseKeyOptions.middle_button'),
      },
      {
        value: 1,
        label: t('mouseKeyOptions.right_button'),
      },
      {
        value: 3,
        label: t('mouseKeyOptions.forward_button'),
      },
      {
        value: 4,
        label: t('mouseKeyOptions.back_button'),
      },
      {
        value: 5,
        label: '宏',
      },
      {
        value: 1000,
        label: t('mouseKeyOptions.multimedia_functions'),
        children: [
          {
            value: 0x0223,
            label: t('mouseKeyOptions.homepage'),
          },
          {
            value: 0x00E2,
            label: t('mouseKeyOptions.mute'),
          },
          {
            value: 0x00E9,
            label: t('mouseKeyOptions.volume_up'),
          },
          {
            value: 0x00EA,
            label: t('mouseKeyOptions.volume_down'),
          },
          {
            value: 0x00B6,
            label: t('mouseKeyOptions.previous_track'),
          },
          {
            value: 0x00B5,
            label: t('mouseKeyOptions.next_track'),
          },
        ],
      },
      {
        value: 1999,
        label: '录制宏',
        hidden: true, // 隐藏
        children: [
          {
            value: 2000,
            label: '录制宏1',
          },
          {
            value: 2001,
            label: '录制宏2',
          },
          {
            value: 2002,
            label: '录制宏3',
          },
          {
            value: 2003,
            label: '录制宏4',
          },
        ],
      },
      // {
      //   "value": "scroll_wheel_tilt",
      //   "label": t('mouseKeyOptions.scroll_wheel_tilt'),
      //   children: [
      //     {
      //       "value": "9",
      //       "label": t('mouseKeyOptions.scroll_wheel_left')
      //     },
      //     {
      //       "value": "10",
      //       "label": t('mouseKeyOptions.scroll_wheel_right')
      //     },
      //   ]
      // },
      // {
      //   "value": "switch_dpi",
      //   "label": t('mouseKeyOptions.switch_dpi'),
      //   children: [
      //     {
      //       "value": "5",
      //       "label": t('mouseKeyOptions.dpi_minus')
      //     },
      //     {
      //       "value": "6",
      //       "label": t('mouseKeyOptions.dpi_plus')
      //     },
      //     {
      //       "value": "7",
      //       "label": t('mouseKeyOptions.dpi_cycle')
      //     },
      //   ]
      // },
      // {
      //   "value": "multimedia_functions",
      //   "label": t('mouseKeyOptions.multimedia_functions'),
      //   children: [
      //     {
      //       "value": "0x0183",
      //       "label": t('mouseKeyOptions.player')
      //     },
      //     {
      //       "value": "0x00CD",
      //       "label": t('mouseKeyOptions.play_pause')
      //     },
      //     {
      //       "value": "0x00B5",
      //       "label": t('mouseKeyOptions.next_track')
      //     },
      //     {
      //       "value": "0x00B6",
      //       "label": t('mouseKeyOptions.previous_track')
      //     },
      //     {
      //       "value": "0x00B7",
      //       "label": t('mouseKeyOptions.stop_playback')
      //     },
      //     {
      //       "value": "0x00E2",
      //       "label": t('mouseKeyOptions.mute')
      //     },
      //     {
      //       "value": "0x00E9",
      //       "label": t('mouseKeyOptions.volume_up')
      //     },
      //     {
      //       "value": "0x00EA",
      //       "label": t('mouseKeyOptions.volume_down')
      //     },
      //     {
      //       "value": "0x018A",
      //       "label": t('mouseKeyOptions.email')
      //     },
      //     {
      //       "value": "0x0192",
      //       "label": t('mouseKeyOptions.calculator')
      //     },
      //     {
      //       "value": "0x0194",
      //       "label": t('mouseKeyOptions.my_computer')
      //     },
      //     {
      //       "value": "0x0223",
      //       "label": t('mouseKeyOptions.homepage')
      //     },
      //     {
      //       "value": "0x0221",
      //       "label": t('mouseKeyOptions.search')
      //     },
      //     {
      //       "value": "0x0225",
      //       "label": t('mouseKeyOptions.web_forward')
      //     },
      //     {
      //       "value": "0x0224",
      //       "label": t('mouseKeyOptions.web_back')
      //     },
      //     {
      //       "value": "0x0226",
      //       "label": t('mouseKeyOptions.stop_web')
      //     },
      //     {
      //       "value": "0x0227",
      //       "label": t('mouseKeyOptions.refresh')
      //     },
      //     {
      //       "value": "0x022A",
      //       "label": t('mouseKeyOptions.favorites')
      //     }
      //   ]
      // },
    ],
  }
}
