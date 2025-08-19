var isCharging = false;
var isBatVol = false;
var lowBattery = false;
var SupChangeBat = false;
var factLevel = 0;

var fullBatteryCount = 0;
var disconnectCount = 0;

var voltages = [3050,3420,3480,3540,3600,3660,3720,3760,3800,3840,
  3880,3920,3940,3960,3980,4000,4020,4040,4060,4080,4110];

var level1TimerID;
var level2TimerID;

var level1TimeEnable = false;
var level2TimeEnable = false;

var displayLevel = 0;
var mouseAdd = [];

function batteryHandleInit(addr, battery) {
  var level = 0;
  level = factLevel = battery.level;
  isCharging = battery.charging;
  isBatVol = battery.voltage > 0;

  mouseAdd = addr;

  var addrString = mouseAdd[0].toString(16).padStart(2, '0') +
  mouseAdd[1].toString(16).padStart(2, '0') + mouseAdd[2].toString(16).padStart(2, '0');
  var item = localStorage.getItem('bat_' + addrString);

  var lastLevel = 0;
  var lastTime = 0;

  var currentTime = Math.floor((new Date()).getTime() / 1000);
  
  var sec = 2000;
  if(item) {
    var tmp = JSON.parse(item);
    console.log("item:",item,tmp);
    lastLevel = Number.parseInt(tmp.level);
    lastTime = Number.parseInt(tmp.time);

    sec = currentTime - lastTime;
  }

  if(isBatVol) {
    level = factLevel = voltageToLevel(battery.voltage,battery.charging);
  }
  console.log("current time:",currentTime,displayLevel,lastLevel,factLevel,sec);
  displayLevel = calculationBattery(lastLevel,factLevel,sec);
  //console.log("current time:",currentTime,displayLevel,factLevel);
  if(level2TimerID == null) {
    level2TimerID = setInterval(level2TimerTick,60000);
  }

  if(level1TimerID == null) {
    level1TimerID = setInterval(level1TimerTick,10000);
  }

  if(displayLevel > 95 && isCharging) {
    level2TimeEnable = false;
  }
  else {
    level1TimeEnable = true;
  }

}

function level1TimerTick() {
  if(level1TimeEnable) {
    if(isCharging) {
      if(factLevel > displayLevel) {
        if(factLevel < 100) {
          if(factLevel -10 > displayLevel) {
            displayLevel++;
          }

          if(displayLevel >= 85) {
            level1TimeEnable = false;
            level2TimeEnable = true;
          }
        }
      }
    }
    else {
      if(factLevel < displayLevel) {
        if(displayLevel > 0) {
          displayLevel --;
        }
      }
    }
  }
}

function level2TimerTick() {
  if(level2TimeEnable) {
    if(displayLevel < 99 && isCharging) {
      displayLevel ++;
    }

    if(displayLevel > 100)
      displayLevel = 100;
  }
}

function setDisplayLevel(battery) {
  var level = 0;

  if(isBatVol) {
    level = factLevel = voltageToLevel(battery.voltage, battery.charging);
  }
  else {
    level = factLevel = battery.level;
  }

  isCharging = battery.charging;

  if(displayLevel >= 85 && level >= 95 && isCharging) {
    if(level1TimeEnable) {
      level1TimeEnable = false;
    }

    if(level2TimeEnable == false) {
      level2TimeEnable = true;
    }
  }
  else {
    if(level1TimeEnable == false) {
      level1TimeEnable = true;
    }    

    if(level2TimeEnable) {
      level2TimeEnable = false;
    }
  }

  if(isCharging == false) {
    fullBatteryCount = 0;

    if(battery.level == 0)
      displayLevel = 0;

    console.log("charging false",displayLevel,factLevel);
    if(displayLevel < 15) {

    }
    else {
      if(battery.level <= 15) {
        if(lowBattery == false) {
          lowBattery = true;

          displayLevel = 15;
        }
      }
    }

    if(SupChangeBat) {
      if(level > displayLevel) {
        if(level - displayLevel >= 30) {
          displayLevel = level;
        }
      }
      else {
        if(displayLevel - level >= 30) {
          displayLevel = level;
        }
      }
    }
  }
  else {
    lowBattery = false;

    if(battery.level == 100) {
      if(fullBatteryCount < 10) {
        fullBatteryCount ++;
      }

      if(fullBatteryCount == 8) {
        displayLevel = 100;
      }
    }
    else 
      fullBatteryCount = 0;
  }

  var item = {
    level:displayLevel,
    time:Math.floor((new Date()).getTime() / 1000),
  };
  localStorage.setItem('bat_' + mouseAdd[0].toString(16).padStart(2, '0') +
  mouseAdd[1].toString(16).padStart(2, '0') + mouseAdd[2].toString(16).padStart(2, '0'),
  JSON.stringify(item))
}

function getDisplayLevel() {
  return displayLevel;
}

function voltageToLevel(voltage,charging) {
  var level = 0;
  var interval = 0;
  var index = -1;
  
  if(voltage > voltages[voltages.length - 1]) {
    if(charging) {
      level = 99;
    }
    else 
      level = 100;
  }
  else {
    for(var i = 0;i < voltages.length;i++) {
      if(voltage < voltages[i]) {
        index = i;
        break;
      }
    }

    if(index != -1) {
      if(index == 0) {
        level = 0;
      }
      else {
        interval = (voltages[index] - voltages[index - 1]) / 5;
        level = (voltage - voltages[index - 1]) / interval + (index - 1) * 5;
      }

      if(level == 0 || level == 15) {
        //如果是0或者15需要等鼠标下发之后才能同步，计算出来15或0需要手动+1
        level++;
      }
    }
  }
  level = Math.round(level);
  console.log("voltageToLevel:",voltage,level);
  return level;
}

function calculationBattery(lastLevel, factLevel, sec) {
  var level = 0;
  var theoryMaxValue = 0;
  var theoryMinValue = 0;

  if(sec > 1800) {
    level = factLevel;
  }
  else if(sec < 60) {
    level = lastLevel;
  }
  else {
    theoryMaxValue = 0.028 * sec;
    theoryMaxValue = theoryMaxValue + lastLevel > 100 ? 100 : theoryMaxValue + lastLevel;
    theoryMinValue = 0.014 * sec;
    if (theoryMinValue > lastLevel)
    {
        theoryMinValue = 0;
    }
    else
        theoryMinValue = lastLevel - theoryMinValue < 0 ? 0 : lastLevel - theoryMinValue;

    if (factLevel > theoryMaxValue)
    {
      level = theoryMaxValue;
    }
    else if (factLevel < theoryMinValue)
    {
      level = theoryMinValue;
    }
    else
    level = lastLevel;    
  }

  return level;
}

function batteryHandleExit() {
  if(level1TimerID) {
    clearInterval(level1TimerID);
  }

  if(level2TimerID) {
    clearInterval(level2TimerID);
  }

  level1TimeEnable = false;
  level2TimeEnable = false;
}

export default {
  batteryHandleInit,
  setDisplayLevel,
  batteryHandleExit,
  getDisplayLevel,
  displayLevel,
}