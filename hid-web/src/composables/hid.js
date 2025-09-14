// const ReportRateAdd = 0x0000;
// const MaxDPIAdd = 0x0002;
// const CurrentDPIAdd = 0x0004;
// const XSpindownAdd = 0x0006;
// const YSpindownAdd = 0x0008;
// const SilenceHeightAdd = 0x000A;
// const DPIValueAdd = 0x000C;
// const DPIColorAdd = 0x002C;
// const DPILightEffectAdd = 0x004C;
// const DPILightBrightnessAdd = 0x004E;
// const DPLightSpeedAdd = 0x0050;
// const DPILightSwitchAdd = 0x0052;

import HIDKey from '../utils/hidKey';
import BatteryHandle from '../utils/batteryHandle';

function checksum(data) {
  // 初始化校验和值
  let checksum_v = 0;

  // 遍历数据数组的前 len-1 个字节
  for (let i = 0; i < data.length - 1; i++) {
      checksum_v += data[i];
  }

  // 返回校验和 (按8位进行掩码处理)
  return checksum_v & 0xFF;
}

/*  */
var Command = {
  EncryptionData:1,//下传加密沟通数据
  PCDriverStatus:2,//下传驱动状态的命令（驱动是否处于窗口激活状态）
  DeviceOnLine:3,//获取无线鼠标是否在线
  BatteryLevel:4, //获取电池电量
  DongleEnterPair:5,//设置无线Dongle进入配对状态
  GetPairState:6,//获取无线Dongle配对结果
  WriteFlashData:7,//设置eeprom内容
  ReadFlashData:8,//获取eeprom内容
  ClearSetting:9,//恢复出厂设置
  StatusChanged:0x0A,//上报鼠标某些状态改变，如DPI等
  SetDeviceVidPid:0x0B,//设置Dongle的USB VID/PID
  SetDeviceDescriptorString:0x0C,//设置Dongle的USB设备描述字符串
  EnterUsbUpdateMode:0x0D,//进入USB升级模式
  GetCurrentConfig:0x0E,//获取当前配置
  SetCurrentConfig:0x0F,//设置当前配置
  ReadCIDMID:0x10,//获取鼠标CID/MID
  EnterMTKMode:0x11,//设置无线Dongle进入EMI/MTK测试模式
  ReadVersionID:0x12,//获取鼠标版本号

  Set4KDongleRGB:0x14,//设置4K dongle RGB灯模式,dongle上有个rgb灯（不是在鼠标上）
  Get4KDongleRGBValue:0x15,
  SetLongRangeMode:0x16,
  GetLongRangeMode:0x17,

  MusicColorful:0xB0,//音乐律动全彩
  MusicSingleColor:0xB1,//音乐律动全键单色

  WriteKBCIdMID:0xF0,//读取cid mid,cx53710专用
  ReadKBCIdMID:0xF1,//读取cid mid,cx53710专用

}

var MouseEepromAddr = {
  ReportRate:0x00,
  MaxDPI:0x02,
  CurrentDPI:0x04,
  DPIValue:0x0C,
  DPIColor:0x2C,
  DPILight:0x4C,
  Light:0xA0,
  DebounceTime:0xA9,
  MotionSync:0xAB,
  Ripple:0xB1,
  MovingOffLight:0xB3,
  SensorMode:0xB9,
  KeyFunction:0x60,
  ShortCutKey:0x0100,
  Macro:0x0300,
}

var on = true;
var off = false;

var ReportId = 0x08;

var device;
var receivedData = [];
var sendingFlag = false;
var flashData = [];
var lightSetting = [];
var lightState = 1;
var sensor = "3395";

var onlineTimerID;
var batteryTimerID;
var pairTimerID;

var pairResult = {
  pairStatus : 0,
  pairLeftTime : 20,
};

var isSetConfig = false;

var getBatteryFlag = true;

var updateInfo = true;
var deviceInfo = {
  connection:false,
  online:false,//设备在不在线
  addr:[],//设备地址
  info:{
    cid:1,//设备的CID，MID
    mid:1,
    type:1//设备类型 0:dongle_1K, 1:dongle_4K, 2:有线_1K  3:有线_4K
  },
  displayBattery:20,
  battery:{
    level:20,//电量百分比
    charging:false,//0：没充电 1：充电中
    voltage:0x0E90,//电池电压
  },
  batteryOptimize:false,
  version:{
    dongle:"v 1.0",//接收器版本
    device:"v 1.0",//设备版本
  },
  profile:0,//设备当前选择的配置
  isRestoring:false,//是否正在恢复出厂设置
  showOfflineDialog:false,
  connecting:false,
}

var mouseCfg = {
  init:false,//第一次获取到全部的eeprom
  isWired:false,//设备是有线还是无线
  maxReportRate:1000,
  readAddr:0,
  reportRate:1,//回报率
  maxDpi:4,//最大DPI
  currentDpi:2,//当前DPI
  xSpindown:0,//
  ySpindown:0,//
  debounceTime:8,//按键防抖时间
  supportLongDistance:true,
  longDistance:false,//远距离模式

  sensor:{//sensor的配置
    lod:1,
    motionSync:false,
    angle:false,
    ripple:false,
    movingOffLight:false,
    performance:false,
    sleepTime:6,
    mode:0,
  },
  dpis:[//DPI的配置
    {
      value:400,
      color:"#ff0000"
    },
    {
      value:800,
      color:"#00ff00"
    },
    {
      value:1600,
      color:"#0000ff"
    },
    {
      value:3200,
      color:"#ff00ff"
    },
    {
      value:400,
      color:"#ff0000"
    },
    {
      value:400,
      color:"#ff0000"
    },
    {
      value:400,
      color:"#ff0000"
    },
    {
      value:400,
      color:"#ff0000"
    },
  ],
  dpiEffect:{//DPI灯效配置
    effect:1,//1.常亮；2.呼吸
    state:on,
    brightness:3,
    speed:3,
  },
  lightEffect:{//灯光灯效配置
    mode:2,
    brightness:3,
    speed:3,
    color:"#ff0000",
    state:on,
    time:3,
  },
  keys:[//按键配置
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
    {
      value:["1","0x0400"]
    },
  ],
  shortCutKey:[//快捷键

  ],
  macro:[//宏

  ]
}

async function requestDevice(index,devicesInfo) {
  let filters = [];
  var conncet = false;

  console.log("index:",index);
  for(let i = 0;i < devicesInfo[index].PID.length;i++)
  {
    let filter = {
      vendorId: Number.parseInt(devicesInfo[index].VID),
      productId: Number.parseInt(devicesInfo[index].PID[i]),
    }
    filters.push(filter);
  }
  //console.log(index,cfg.Dev[index].VID,cfg.Dev[index].PID,filters);

  // const usbDevices = await navigator.usb.requestDevice({filters});

  // console.log(usbDevices);
  // await usbDevices.open();
  // await usbDevices.selectConfiguration(usbDevices.configurations[0].configurationValue);
  // await usbDevices.claimInterface(usbDevices.configurations[0].interfaces[2].interfaceNumber);
  // const data = new Uint8Array([1, 2, 3]);
  // await usbDevices.transferOut(1, data);

  const devices = await navigator.hid.requestDevice({filters});
  if(devices.length == 0)
    return false;


  console.log("设备列表========", devices)

  for(let temp of devices) {
      for(let i = 0;i < temp.collections.length;i++) {
        if(temp.collections[i].inputReports.length === 1
          && temp.collections[i].outputReports.length === 1)
          {
            ReportId = temp.collections[i].outputReports[0].reportId;
            device = temp;
            conncet = connect();
            break;
          }
      }
  }
  return conncet;
}

async function connect() {
  if(!device.opened)
  {
    await device.open();
  }

  deviceInfo.connection = true;
  read();

  mouseCfg.init = false;
  console.log('open HID:',device);
  // onlineTimerID = setInterval(getOnlineInterval,1500);

  disconnect();

  return true;
}

async function reconnect() {
  const devices = await navigator.hid.getDevices();
  if(devices.length > 0)
  {
    console.log(devices);
    for(let temp of devices)
    {
      console.log('Reconnect Device:', temp);

      if(temp.collections.length > 2)
      {
        device = temp;
        connect();
        break;
      }
    }
  }
}

function exit() {
  if(pairTimerID) {
    clearInterval(pairTimerID);
  }

  if(batteryTimerID) {
    clearInterval(batteryTimerID);
  }

  if(onlineTimerID) {
    clearInterval(onlineTimerID);
  }

  BatteryHandle.batteryHandleExit();
  deviceInfo.batteryOptimize = false;
  deviceInfo.connection = false;
}

function disconnect() {
  navigator.hid.ondisconnect = (event) => {
    //设备主动断开
    exit();
    console.log("HID disconnected:",event);
  }
}

function closeDevice(){
  // 关闭设备
  exit();
  device.close();
}

function read() {
  device.oninputreport = async (event) => {
    if(event.reportId === ReportId)
    {
      receivedData = new Uint8Array(event.data.buffer);

      let command = receivedData[0];

      if(receivedData[1] == 0)
      {
        switch(command)
        {
          case Command.EncryptionData:
            deviceInfo.info.cid = receivedData[9];
            deviceInfo.info.mid = receivedData[10];
            deviceInfo.info.type = receivedData[11];

            if(deviceInfo.info.type == 0x02) {
              mouseCfg.isWired = true;
              mouseCfg.maxReportRate = 1000;
            }
            else if(deviceInfo.info.type == 0x03) {
              mouseCfg.isWired = true;
              mouseCfg.maxReportRate = 8000;
            }
            else {
              mouseCfg.isWired = false;
              if(deviceInfo.info.type == 0x00) {
                mouseCfg.maxReportRate = 1000;
              }
              else if(deviceInfo.info.type == 0x01) {
                mouseCfg.maxReportRate = 4000;
              }
              else if(deviceInfo.info.type == 0x04) {
                mouseCfg.maxReportRate = 2000;
              }
              else if(deviceInfo.info.type == 0x05) {
                mouseCfg.maxReportRate = 8000;
              }
            }
            break;

          case Command.PCDriverStatus:
            break;

          case Command.DeviceOnLine:
            deviceInfo.online = receivedData[5];
            deviceInfo.addr.length = 3;
            deviceInfo.addr[2] = receivedData[6];
            deviceInfo.addr[1] = receivedData[7];
            deviceInfo.addr[0] = receivedData[8];
            break;

          case Command.BatteryLevel:
            deviceInfo.battery.level = receivedData[5];
            deviceInfo.battery.charging = receivedData[6] == 1;
            deviceInfo.battery.voltage = (receivedData[7] << 8) + receivedData[8];
            // if(deviceInfo.batteryOptimize == false) {
            //   BatteryHandle.batteryHandleInit(deviceInfo.addr,deviceInfo.battery);
            //   BatteryHandle.setDisplayLevel(deviceInfo.battery);
            //   deviceInfo.battery.level = BatteryHandle.getDisplayLevel();
            //   deviceInfo.batteryOptimize = true;
            // }
            // else {
            //   BatteryHandle.setDisplayLevel(deviceInfo.battery);
            //   console.log("setDisplayLevel:",deviceInfo.battery,BatteryHandle.getDisplayLevel());
            //   deviceInfo.battery.level = BatteryHandle.getDisplayLevel();
            // }
            break;

          case Command.DongleEnterPair:
            getBatteryFlag = false;
            pairTimerID = setInterval(getPairResult,1000);
            break;

          case Command.GetPairState:
            pairResult.pairStatus = receivedData[5];
            pairResult.pairLeftTime = receivedData[6];

            if(pairResult.pairStatus == 2 ||
              pairResult.pairStatus == 3 ||
              pairResult.pairLeftTime == 0) {
                getBatteryFlag = true;
                if(pairTimerID) {
                  clearInterval(pairTimerID);
                }
              }
            break;

          case Command.WriteFlashData:
            var addr = 0;
            addr = (receivedData[3] << 8) + receivedData[4];
            var len = receivedData[4];
            break;

          case Command.ReadFlashData:
            var addr = 0;
            addr = (receivedData[2] << 8) + receivedData[3];
            var len = receivedData[4];

            for(var i = 0;i < len;i++)
            {
              flashData[addr + i] = receivedData[5 + i];
            }

            if ((len < 10) && updateInfo && mouseCfg.init)
            {
              updateDeviceInfo();
            }
            break;

          case Command.ClearSetting:
            deviceInfo.isRestoring = false;
            break;

          case Command.StatusChanged:
            var value = receivedData[5];

            //DPI档位变化，需要获当前DPI的配置
            if((value & 0x01) == 0x01)
            {
              getCurrentDPI();
            }

            //报告率变化，需要当前报告率的配置
            if((value & 0x02) == 0x02)
            {
              getReport();
            }

            //配置变化，需要获取鼠标的所有设置,与打开驱动时同步鼠标的设置操作一样
            if((value & 0x04) == 0x04)
            {
              getProfile();
            }

            //DPI指示灯变化，需要获取DPI指示灯的配置
            if((value & 0x08) == 0x08)
            {
              getDPILight();
            }

            //LOGO指示灯状态改变，需要获取LOGO灯的配置
            if((value & 0x10) == 0x10)
            {

            }

            //灯带状态改变，需要获取灯带的配置
            if((value & 0x20) == 0x20)
            {
              getLight();
            }

            //电量百分比发生改变，需要获取电量
            if((value & 0x40) == 0x40)
            {
              getBattery();
            }

            //保留
            if((value & 0x80) == 0x80)
            {

            }
            break;

          case Command.GetCurrentConfig:
            deviceInfo.profile = receivedData[5];
            break;

           case Command.SetCurrentConfig:

            break;

          case Command.ReadVersionID:
            var version = "v " + receivedData[5].toString()
            + "." + receivedData[6].toString(16).padStart(2, '0');
            deviceInfo.version.device = version;
            break;

          case Command.SetLongRangeMode:
            break;

          case Command.GetLongRangeMode:
            mouseCfg.supportLongDistance = true;
            mouseCfg.longDistance = receivedData[5] == 1;
            break;
        }
      }
      else if(receivedData[1] == 1)
      {
        switch(command)
        {

          //不支持远距离模式
          case Command.GetLongRangeMode:
            mouseCfg.supportLongDistance = false;
            break;
        }
      }
      sendingFlag = false;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function write64(data) {
  await device.sendReport(ReportId, data);
}

async function write(data) {
  var result = false;
  for(var i = 0;i < 5;i++)
  {
    var cnt = 0;
    result = true;
    sendingFlag = true;
    await device.sendReport(ReportId, data);

    // await device.sendReport(ReportId, Uint8Array.of(
    //   0x02,0x8, 0xe, 0x2, 0x0,0x4, 0x1,0x0, 0xa, 0x4, 0x0, 0x0, 0xa,0x5,0x1, 0x0,0x1,0x5,0x0,0x0,0xa,0x6,0x1,0x0,0xa,0x6,0x0,0x0,0xa,0x7,
    //   0x1,0x0,0xa,0x7,0x0,0x0,0xa,0x8,0x1,0x0,0xa,0x8,0x0,0x0,0xa,0x9,0x1,0x0,0xa,0x9,0x0,0x0,0xa,0xa,0x1,0x0,0xa,0xa,0x0,
    //   0x0,0xa,0x0,0x0,0x14));
    // await device.sendReport(ReportId,
    //   Uint8Array.of(
    //     0x10,0x06,0x01,0x00,0x00,0x04,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    //     0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    //     0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    //     0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x1b
    //   ))
    do {
      await sleep(10);
      cnt++;
    }while(sendingFlag && (cnt < 20));

    //console.log("write:",sendingFlag,cnt,receivedData);

    if(data[0] == 0x08) {
      for(var j = 0;j < 5;j++)
      {
        if(data[j] !== receivedData[j])
        {
          result = false;
          break;
        }
      }
    }
    else {
      for(var j = 0;j < 3;j++)
      {
        if(data[j] !== receivedData[j])
        {
          result = false;
          break;
        }
      }
    }


    if(result == true)
      break;
  }
  return result;
}

function getUsbCrc(value) {
  let crc = 0;
  for(let i = 0;i < value.length - 1;i++)
  {
    crc += value[i];
  }
  crc = (crc & 0xFF);
  crc = 0x55 - crc;
  return crc;
}

//下发带数据的数组类型指令
async function setArrayCommand(com,value) {
  let data = Uint8Array.of(com, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef);
  let crc = 0;
  data[4] = value.length;
  for(let i = 0;i < value.length;i++)
  {
    data[5 + i] = value[i];
  }
  crc = getUsbCrc(data);
  data[15] = crc - ReportId;

  return await write(data);
}

//下发不带数据类型指令
async function setByteCommand(com) {
  let data = Uint8Array.of(com, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef); // 示例数据

  let crc = getUsbCrc(data);
  data[15] = crc  - ReportId;

  await write(data);
}

async function setEncryption() {
  var arr = [];
  // 获取指定范围内的随机整数（包括最小值和最大值）
  var min = 0;
  var max = 255;

  arr[0] = Math.floor(Math.random() * (max - min + 1)) + min;
  arr[1] = Math.floor(Math.random() * (max - min + 1)) + min;
  arr[2] = Math.floor(Math.random() * (max - min + 1)) + min;
  arr[3] = Math.floor(Math.random() * (max - min + 1)) + min;

  arr[4] = 0;
  arr[5] = 0;
  arr[6] = 0;
  arr[7] = 0;

  await setArrayCommand(Command.EncryptionData,arr);
}

async function setPCState(value) {
  var arr = [];
  arr[0] = value;
  await setArrayCommand(Command.PCDriverStatus,arr);
}

async function getOnlineNoDialog() {
  await setByteCommand(Command.DeviceOnLine);

  if(receivedData[5] === 1)
    return true;
  else
    return false;
}

async function getOnline() {
  await setByteCommand(Command.DeviceOnLine);

  if(receivedData[5] === 1)
    return true;
  else
  {
    deviceInfo.showOfflineDialog = true;
    return false;
  }
}

async function getBattery() {
  if(getBatteryFlag) {
    var flag = await getOnlineNoDialog() ;

    if(flag == true) {
      await setByteCommand(Command.BatteryLevel);
    }
    else
    {
      getBatteryFlag = false;
      deviceInfo.batteryOptimize = false;
      onlineTimerID = setInterval(getOnlineInterval,1500);
    }
  }
}

async function enterPairMode(cid,mid) {
  var value = [];
  value[0] = 0;
  value[1] = 0;
  await setArrayCommand(Command.DongleEnterPair,value);
}

async function getPairResult() {
  await setByteCommand(Command.GetPairState);
}

function getDeviceInfo() {
  return deviceInfo;
}

async function setDeviceRestore() {
  var flag = await getOnline() ;

  if(flag == true) {
    deviceInfo.isRestoring = true;
    let data = Uint8Array.of(Command.ClearSetting, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef); // 示例数据

      let crc = getUsbCrc(data);
      data[15] = crc  - ReportId;

      await device.sendReport(ReportId, data);
      mouseCfg.init = false;
      await readFullFlash();
      mouseCfg.init = true;
  }
}

async function setProfile(value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    var data =[];
    data.push(value);
    await setArrayCommand(Command.SetCurrentConfig,data);

    await readFullFlash();
    mouseCfg.init = true;
  }
}

async function getProfile() {
  await setByteCommand(Command.GetCurrentConfig);
}

async function getVersion() {
  await setByteCommand(Command.ReadVersionID);
}

// 数据长度是10个
async function setLongDistance(value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    var data = [];
    data[0] = value;
    for(var i = 1;i < 10;i++)
    {
      data[i] = 0x00;
    }
    flag = await setArrayCommand(Command.SetLongRangeMode,data);
  }
  return flag;
}

async function getLongDistance() {
  await setByteCommand(Command.GetLongRangeMode);
}

//设置eeprom内容（长度>=2）
async function setArrayEeprom(address,value) {
  let data = Uint8Array.of(0x07, 0x00, address >> 8, address & 0xFF, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef);

  var cnt = (value.length % 10);
  cnt = (cnt > 0) ? (Math.floor(value.length / 10) + 1): Math.floor(value.length / 10);
  console.log("setArrayEeprom:",cnt,value.length,value);
  for(var i = 0;i < cnt;i ++)
  {
    var add = (address + i * 10);
    var len = ((((i + 1) * 10) > value.length) ? (value.length - (i * 10)) : 10);

    data[0] = 0x07;
    data[1] = 0x00;
    console.log("setArrayEeprom len",len);
    data[2] = add >> 8;
    data[3] = add & 0xFF;
    data[4] = len;
    for(var j = 0; j < 10; j++)
    {
      if(j < len)
        data[5 + j] = value[j + i * 10];
      else
      data[5 + j] = 0;
    }

    data[15] = getUsbCrc(data) - ReportId;

    await write(data);
  }
}

//设置eeprom内容（长度==1）
async function setByteEeprom(address,value) {
  let data = Uint8Array.of(0x07, 0x00, address >> 8, address & 0xFF, 0x02, 0x08, 0x4d,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef); // 示例数据

  data[5] = value;
  data[6] = 0x55 - value;
  let crc = getUsbCrc(data);
  data[15] = crc - ReportId;

  await write(data);
}

//获取eeprom数据
async function getEepromBuffer(address,length) {
  let data = Uint8Array.of(0x08, 0x00, address >> 8, address & 0xFF, length, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef);
  let crc = 0;
  crc = getUsbCrc(data);
  data[15] = crc - ReportId;

  await write(data);
}

async function readFullFlash() {
  mouseCfg.init = false;
  let data = Uint8Array.of(0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef); // 示例数据
  var add = 0;
  do {
    var result = true;
    data[2] = add >> 8;
    data[3] = add & 0xFF;
    data[4] = 10;

    let crc = getUsbCrc(data);
    data[15] = crc  - ReportId;

    await write(data);

    for(var i = 0;i < 5;i++)
    {
      if(data[i] !== receivedData[i])
      {
        result = false;
        break;
      }
    }

    if(result)
    {
      for(var j = 0;j < 10;j++)
      {
        flashData[add + j] = receivedData[j + 5];
      }
      add += 10;
    }
    else
    {
      console.log("read fail",add);
    }
  }while(add < 0x100);

  console.log("readFullFlash",flashData);
  await updateDeviceInfo();
}

async function getOnlineInterval() {
  var flag = await getOnlineNoDialog();
  deviceInfo.connecting = true;
  if(flag)
  {
    deviceInfo.connecting = false;
    clearInterval(onlineTimerID);
    await setPCState(1);
    await setEncryption();
    await readFullFlash();
    await getBattery();
    await getProfile();
    await getVersion();
    await getLongDistance();
    mouseCfg.init = true;
    getBatteryFlag = true;
  }
}

function bufferToColor(buffer,index) {
  var color = "#" + buffer[index].toString(16).padStart(2, '0') +
  buffer[index + 1].toString(16).padStart(2, '0') + buffer[index + 2].toString(16).padStart(2, '0');
  return color;
}

async function updateDeviceInfo() {
  var report = 1000;
  if(flashData[0] >= 0x10)
  {
    report = (flashData[0] / 0x10) * 2000;
  }
  else
  {
    report = 1000 / flashData[0];
  }

  mouseCfg.reportRate = report;
  mouseCfg.maxDpi = flashData[2];
  mouseCfg.currentDpi = flashData[4];
  mouseCfg.sensor.lod = flashData[0x0A];

  for(var i = 0;i < 8;i ++)
  {
    var addr = i * 4 + 0x0C;
    var high = (flashData[addr + 2] & 0x0C) >> 2;
    var value = (flashData[addr]) + (high << 8);
    value = (value + 1) * 50;
    mouseCfg.dpis[i].value = value;
    mouseCfg.dpis[i].color = bufferToColor(flashData,addr + 0x20);
  }

  mouseCfg.dpiEffect.effect = flashData[0x4C];
  mouseCfg.dpiEffect.brightness = DPILightBriToIndex(flashData[0x4E]);
  mouseCfg.dpiEffect.speed = flashData[0x50];
  mouseCfg.dpiEffect.state = flashData[0x52] == 1?on : off;

  mouseCfg.lightEffect.mode = flashData[0xA0];
  mouseCfg.lightEffect.color = bufferToColor(flashData,0xA1);;
  mouseCfg.lightEffect.speed = flashData[0xA4];
  mouseCfg.lightEffect.brightness = flashData[0xA5];
  mouseCfg.lightEffect.state = flashData[0xA7] == 1?on : off;
  mouseCfg.lightEffect.time = flashData[0xAD];

  mouseCfg.debounceTime = flashData[0xA9];
  mouseCfg.sensor.motionSync = flashData[0xAB] == 1;
  mouseCfg.sensor.sleepTime = flashData[0xB7];
  mouseCfg.sensor.angle = flashData[0xAF] == 1;
  mouseCfg.sensor.ripple = flashData[0xB1] == 1;
  mouseCfg.sensor.performance = flashData[0xB5] == 1;
  mouseCfg.sensor.mode = flashData[0xB9];

  mouseCfg.movingOffLight = flashData[0xB3];

  if(mouseCfg.init == false) {
    mouseCfg.shortCutKey = [];
    mouseCfg.macro = [];
    for(var i = 0;i < 16;i++)
    {
      var addr = i * 4 + 0x60;
      var tmp = (flashData[addr + 1] << 8) + flashData[addr + 2];
      var value = [flashData[addr].toString(16),"0x" + tmp.toString(16).padStart(4, '0'),];
      mouseCfg.keys[i] = value;

      var shortCut = {
        isMedia : false,
        text : "",
        contexts : [],
      }

      if(value[0] == 0x05) {
        await getShortCutKey(i);
        var contexts = updateShortCutKey(i);

        if(contexts.length == 1) {
          if(contexts[0].type == 2) {
            shortCut.isMedia = true;
            var context = {
              type : contexts[0].type,
              value : "0x" + contexts[0].value.toString(16).padStart(4, '0').toUpperCase(),
            };
            shortCut.contexts.push(context);
          }
        }

        if(shortCut.isMedia == false) {
          var texts = [];
          for(var j = 0;j < contexts.length; j++) {
            var tmp = HIDKey.HIDToKey(contexts[j]);
            texts.push(tmp.text);
          }

          shortCut.text = texts[0];
          for(var j = 1;j < texts.length; j++) {
            shortCut.text += "+" + texts[j];
          }

          console.log("shortcut:",shortCut.text);

          shortCut.contexts = contexts;
        }
      }
      mouseCfg.shortCutKey.push(shortCut);

      var macro = {
        name : "",
        contexts : [],
      }

      if(value[0] == 6) {
        await getMacro(i);
        macro = updateMacro(i);
      }
      mouseCfg.macro.push(macro);
    }

    if(batteryTimerID != null) {
      clearInterval(batteryTimerID);
    }

    batteryTimerID = setInterval(getBattery,5000);
  }

  console.log("mouse Config:",mouseCfg);

  //鼠标配置初始化成功
  //mouseCfg.init = true;
}

function updateShortCutKey(index) {
  var addr = MouseEepromAddr.ShortCutKey + 0x20 * index;
  var count = flashData[addr];
  var contexts = [];
  for(var i = 0;i < (count / 2);i ++) {
    var type = flashData[addr + i * 0x03 + 1] & 0x0F;
    var value = (flashData[addr + i * 0x03 + 3] << 8) +
    flashData[addr + i * 0x03 + 2];
    var context = {
      type : type,
      value : value,
    };
    contexts.push(context);
  }
  return contexts;
}

function updateMacro(index) {
  var addr = MouseEepromAddr.Macro + 0x180 * index;

  var nameLen = flashData[addr];
  var contextLen = flashData[addr + 0x1F];
  var context;
  if ((nameLen <= 30) && (nameLen > 0)
    && (contextLen <= 70) && (contextLen >= 2))
  {
    var names = [];
    for(var i = 0;i < nameLen;i++) {
      names.push(String.fromCharCode(flashData[addr + 1 + i]));
    }

    var name = names[0];
    for(var i = 1;i < names.length;i++) {
      name += names[i];
    }
    console.log("updateMacro:",index,name);

    var contexts = [];
    for(var i = 0;i < contextLen;i++) {
      var tmp = flashData[addr + 0x20 + i * 5];

      var status = tmp >> 6;
      status = status === 2 ? 0 : 1;
      var type = tmp & 0x0F;
      var value = (flashData[addr + 0x20 + i * 5 + 2] << 8) +
                   flashData[addr + 0x20 + i * 5 + 1];

      var hidKey = {
        type : type,
        value : value,
      }
      var key;
      if(hidKey.type == 0x01) {
        key = HIDKey.HIDToKey(hidKey);
      }
      else {
        key = {
          type : hidKey.type,
          value : hidKey.value,
          text : ''
        }
      }
      var delay = (flashData[addr + 0x20 + i * 5 + 3] << 8) +
                   flashData[addr + 0x20 + i * 5 + 4];
      var context ={
        status:status,
        type:key.type,
        value:key.value,
        delay:delay,
        text:key.text,
      };

      contexts.push(context);
    }

    var macro = {
      name : name,
      contexts : contexts,
    }

    return macro;
  }
  return null;
}

async function setReportRate(value) {
  var flag = await getOnline();

  if(flag == true){
    var reportRate = 1;
    if(value <= 1000)
    {
      reportRate = 1000 / value;
    }
    else
    {
      reportRate = (value / 2000) * 0x10;
    }

    await setByteEeprom(MouseEepromAddr.ReportRate, reportRate);
  }
}

async function getReport() {
  await getEepromBuffer(MouseEepromAddr.ReportRate, 2);
}

async function setMaxDPI(value) {
  var flag = await getOnline();

  if(flag == true)
    await setByteEeprom(MouseEepromAddr.MaxDPI, value);
}

async function setCurrentDPI(value) {
  var flag = await getOnline();

  if(flag == true)
    await setByteEeprom(MouseEepromAddr.CurrentDPI, value);
}

async function getCurrentDPI() {
  await getEepromBuffer(MouseEepromAddr.CurrentDPI, 2);
}

async function setXSpindown(value) {
  await setByteEeprom(0x06,value);
}

async function setYSpindown(value) {
  await setByteEeprom(0x08,value);
}

async function setDPIValue(index,value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    var addr = MouseEepromAddr.DPIValue + index * 4;
    var data = Uint8Array.of(0x00,0x00,0x00,0x00);
    var low = (value / 50 - 1) & 0xFF;
    data[0] = low;
    data[1] = low;
    var high = (value / 50 - 1) >> 8;
    data[2] = (high << 2) | (high << 6);
    data[3] = getUsbCrc(data);
    console.log("setDPIValue",data);
    await setArrayEeprom(addr,data);
  }
}

async function setDPIColor(index,value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    var addr = MouseEepromAddr.DPIColor + index * 4;
    await setArrayEeprom(addr, value);
  }
}

async function getDPILight() {
    await getEepromBuffer(MouseEepromAddr.DPILight, 8);
}

async function setDPILightEffect(value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    await setByteEeprom(MouseEepromAddr.DPILight, value);
    await setByteEeprom(0x52,1);
  }
}

async function setDPILightBri(value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    var bri = IndexToDPILightBri(value);
    await setByteEeprom(0x4E,value);
  }
}

/// <summary>
/// DPI亮度值切换
/// </summary>
/// <param name="index"></param>
/// <returns></returns>
function IndexToDPILightBri(index)
{
    /*
      * 1=0x10
      * 2=0x1E
      * 3=0x3C
      * 4=0x5A
      * 5=0x80(默认)
      * 6=0x96
      * 7=0xB4
      * 8=0xD2
      * 9=0xE6
      * 10=0xFF
      */
    var value = 0;
    switch (index)
    {
        case 1:
            value = 0x10;
            break;
        case 2:
        case 3:
        case 4:
        case 6:
        case 7:
        case 8:
            value = 0x1E * (index - 1);
            break;
        case 5:
            value = 0x80;
            break;
        case 9:
            value = 0xE6;
            break;
        case 10:
            value = 0xFF;
            break;
        default:
            value = 0x80;
            break;
    }

    return value;
}

function DPILightBriToIndex(value) {
  /*
  * 1=0x10
  * 2=0x1E
  * 3=0x3C
  * 4=0x5A
  * 5=0x80(默认)
  * 6=0x96
  * 7=0xB4
  * 8=0xD2
  * 9=0xE6
  * 10=0xFF
  */
  var index = 0;

  if (value % 0x1E == 0)
  {
      index = value / 0x1E + 1;
  }
  else
  {
      switch (value)
      {
          case 0x10:
              index = 1;
              break;
          case 0x80:
              index = 5;
              break;
          case 0xE6:
              index = 9;
              break;
          case 0xFF:
              index = 10;
              break;
          default:
              index = 5;
              break;
      }
  }

  return index;
}

async function setDPILightSpeed(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x50,value);
}

async function setDPILightOff() {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x52,0);
}

async function setRGBColor(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setArrayEeprom(0x54,value);
}

async function setRGBEffect(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x58,value);
}

async function setRGBSpeed(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x5A,value);
}

async function setRGBBri(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x5C,value);
}

async function setLightPowerSave(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x5E,value);
}

async function getLight() {
  await getEepromBuffer(0xA0,7);
}

async function setLightColor(value) {
  var flag = await getOnline() ;

  if(flag == true)
  {
    lightSetting[1] = value[0];
    lightSetting[2] = value[1];
    lightSetting[3] = value[2];
    await setArrayEeprom(0xA0,lightSetting);
  }
}

async function setLightMode(value) {
  var flag = await getOnline();

  if(flag == true)
  {
    lightSetting[0] = value;
    await setArrayEeprom(0xA0,lightSetting);
    if(lightState === 0)
    {
      await setByteEeprom(0xA7,1);
      lightState = 1;
    }
  }
}

async function setLightBri(value) {
  var flag = await getOnline();

  if(flag == true)
  {
    lightSetting[5] = value;
    await setArrayEeprom(0xA0,lightSetting);
  }
}

async function setLightSpeed(value) {
  var flag = await getOnline();

  if(flag == true)
  {
    lightSetting[4] = value;
    await setArrayEeprom(0xA0,lightSetting);
  }
}

async function setLightOff() {
  var flag = await getOnline();

  if(flag == true)
  {
    lightState = 0;
    await setByteEeprom(0xA7,0);
  }
}

async function setLOD(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0x0A,value);
}

async function setDebounceTime(value) {
  var flag = await getOnline();

  if(flag == true)
    await setByteEeprom(0xA9,value);
}

async function setMotionSync(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xAB,value);
}

async function setMoveLightOffTime(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xAD,value);
}

async function setFixLine(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xAF,value);
}

async function setRipple(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xB1,value);
}

async function setMoveLightOffState(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xB3,value);
}

async function setPerformanceState(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xB5,value);
}

async function setPerformanceTime(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xB7,value);
}

async function setSensorMode(value) {
  var flag = await getOnline();

  if(flag == true)
    await setByteEeprom(MouseEepromAddr.SensorMode,value);
}

async function setKeyFunction(index,value) {
  var flag = await getOnline();

  if(flag == true)
  {
    var addr = MouseEepromAddr.KeyFunction + index * 4;
    let data = Uint8Array.of(0x08, 0x00, 0x00, 0x00); // 示例数据
    data[0] = value[0];
    data[1] = value[1];
    data[2] = value[2];
    data[3] = getUsbCrc(data);
    await setArrayEeprom(addr,data);
  }
}

async function setMultimedia(index,multimedia)
{
  var flag = await getOnline();

  if(flag == true)
  {
    var addr = MouseEepromAddr.ShortCutKey + index * 0x20;
    var value = [];

    var cnt = 0;
    value[cnt++] = 0x02;
    value[cnt++] = 0x82;
    value[cnt++] = multimedia & 0xFF;
    value[cnt++] = multimedia >> 8;

    value[cnt++] = 0x42;
    value[cnt++] = multimedia & 0xFF;
    value[cnt++] = multimedia >> 8;

    value[cnt] = 0;
    value[cnt] = getUsbCrc(value);
    console.log("setMultimedia:",multimedia,value);
    await setArrayEeprom(addr,value);
  }
}

async function setShortCutKey(index,shortCut) {
  var flag = await getOnline();

  if(flag == true) {
    var addr = MouseEepromAddr.ShortCutKey + index * 0x20;
    var value = [];

    var cnt = shortCut.length;
    console.log("shortCutKey:",shortCut,cnt);
    value.push(cnt * 2);
    for(var i = 0;i < cnt;i++) {
      var tmp = HIDKey.keyToHID(shortCut[i]);
      console.log("setShortCutKey:",tmp,shortCut[i]);

      value.push(tmp.type | 0x80);
      value.push(tmp.value & 0xFF);
      value.push((tmp.value >> 8) & 0xFF);
    }

    for(var i = 0;i < cnt;i++) {
      var tmp = HIDKey.keyToHID(shortCut[cnt - 1 - i]);
      console.log("setShortCutKey:",tmp);

      value.push(tmp.type | 0x40);
      value.push(tmp.value & 0xFF);
      value.push((tmp.value >> 8) & 0xFF);
    }

    value.push(getUsbCrc(value));
    await setArrayEeprom(addr,value);
  }
}

async function getShortCutKey(index) {
  updateInfo = false;
  await getEepromBuffer(MouseEepromAddr.ShortCutKey + index * 0x20, 10);
  var count = flashData[MouseEepromAddr.ShortCutKey + index * 0x20];
  if(count > 2) {
    var cnt = ((count * 4 - 10) / 10) + 1;
    cnt = Math.floor(cnt);
    console.log("getShortCutKey:",cnt);
    for(var i = 0;i < cnt;i++) {
      var tmp = (cnt - i + 2) * 4 - 10;
      var len = tmp > 10 ? 10 : tmp;
      await getEepromBuffer(MouseEepromAddr.ShortCutKey + index * 0x20 + (i + 1) * 10, len);
    }
  }
  updateInfo = true;
}

async function setMacroName(index,name) {
  var flag = await getOnline();

  if(flag == true) {
    var value = [];

    value[0] = name.length;
    for(let i = 0; i < name.length; i++) {
      value.push(name.charCodeAt(i));
    }

    var addr = MouseEepromAddr.Macro + index * 0x180;
    await setArrayEeprom(addr,value);
  }
}

async function setMacroContext(index, contexts) {
  var flag = await getOnline();

  if(flag == true) {
    var value = [];

    value[0] = contexts.length;
    for(let i = 0; i < contexts.length; i++) {
      var status = 0;
      switch(contexts[i].status)
      {
        case 0:
          status = 2;
          break;

        case 1:
          status = 1;
          break;
      }
      var para = (status << 6) + contexts[i].type;
      value.push(para);

      para = (contexts[i].value & 0xFF);
      value.push(para);

      para = contexts[i].value >> 8;
      value.push(para);

      para = contexts[i].delay >> 8;
      value.push(para);

      para = (contexts[i].delay & 0xFF);
      value.push(para);
    }
    value.push(0);
    value[value.length - 1] = getUsbCrc(value);
    var addr = MouseEepromAddr.Macro + index * 0x180 + 0x1F;
    await setArrayEeprom(addr,value);
  }
}

async function setMacro(index,macro) {
  await setMacroName(index, macro.name);
  await setMacroContext(index, macro.contexts);
}

async function restoreMacro(index) {
  var addr = MouseEepromAddr.Macro + index * 0x180;
  var value = Uint8Array.from({length: 0x180},()=>0);

  var flag = await getOnline();

  if(flag == true)
    await setArrayEeprom(addr,value);
}

async function getMacroName(index) {
  var addr = MouseEepromAddr.Macro + index * 0x180;
  await getEepromBuffer(addr, 10);

  var count = flashData[addr];
  if(count > 10) {
    var cnt = ((count - 10) / 10) + 1;
    for(var i = 1;i < cnt;i++) {
      var tmp = count - i * 10;
      var len = tmp > 10 ? 10 : tmp;
      await getEepromBuffer(addr + i * 10, len);
    }
  }
}

async function getMacroContext(index) {
  var addr = MouseEepromAddr.Macro + index * 0x180 + 0x1F;
  await getEepromBuffer(addr, 10);

  var count = flashData[addr];
  if(count > 2) {
    var cnt = ((count * 5 - 10) / 10) + 1;
    cnt = Math.floor(cnt);
    for(var i = 0;i < cnt;i++) {
      var tmp = (cnt - i + 2) * 5 - 10;
      var len = tmp > 10 ? 10 : tmp;
      await getEepromBuffer(addr + (i + 1) * 10, len);
    }
  }
}

async function getMacro(index) {
  updateInfo = false;
  await getMacroName(index);
  await getMacroContext(index);
  updateInfo = true;
}

//保留：暂时没用上
async function setRFTXTime(value) {
  var flag = await getOnline() ;

  if(flag == true)
    await setByteEeprom(0xBB,value);
}

function setSensor(value)
{
  sensor = value;
}


export default {
  // 请求连接HID设备
  requestDevice,
  reconnect,
  write64,

  // 按键页
  // 设置按键功能
  setKeyFunction,
  // 设置按键防抖时间
  setDebounceTime,
  //设置多媒体
  setMultimedia,
  //设置快捷键
  setShortCutKey,
  //设置宏名称
  setMacroName,
  //设置宏的内容
  setMacroContext,
  //设置宏
  setMacro,
  //恢复默认宏
  restoreMacro,

  // Sensor页
  // 设置报告率
  setReportRate,
  // 设置最大DPI
  setMaxDPI,
  // 设置当前DPI档位
  setCurrentDPI,
  // 设置DPI值
  setDPIValue,
  // 设置DPI颜色
  setDPIColor,
  // 设置Sensor模式
  setSensorMode,
  // 设置LOD高度
  setLOD,
  // 设置火力全开状态
  setPerformanceState,
  // 设置火力全开时间
  setPerformanceTime,
  // 设置直线修正
  setFixLine,
  // 设置波纹修正
  setRipple,
  // 设置Motion Sync
  setMotionSync,
  // 设置DPI灯模式
  setDPILightEffect,
  // 设置DPI灯亮度
  setDPILightBri,
  // 设置DPI灯速度
  setDPILightSpeed,
  // 关闭DPI灯
  setDPILightOff,

  // 灯光页
  // 设置灯光颜色
  setLightColor,
  // 设置灯光模式
  setLightMode,
  // 设置灯光亮度
  setLightBri,
  // 设置灯光速度
  setLightSpeed,
  // 设置移动关灯状态
  setMoveLightOffState,
  // 设置移动关灯时间
  setMoveLightOffTime,
  setLightPowerSave,
  setLightOff,

  setMultimedia,

  setPCState,
  enterPairMode,
  getPairResult,
  setDeviceRestore,
  setProfile,
  setLongDistance,

  getDeviceInfo,
  setSensor,
  IndexToDPILightBri,
  DPILightBriToIndex,

  closeDevice,
  deviceInfo,
  mouseCfg,

  pairResult,
}
