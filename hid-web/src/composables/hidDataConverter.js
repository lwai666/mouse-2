/**
 * Converts profileInfo object back to an array of data objects representing the raw data packets
 * @param {Object} profileInfo - The profile information object
 * @return {Array} Array of data objects representing the raw data packets
 */
export function profileInfoToData(profileInfo) {
  const result = [];

  // Helper functions
  function splitIntoHighAndLow8Bits(value) {
    const low8Bits = value & 0xFF;
    const high8Bits = (value >> 8) & 0xFF;
    return { low8Bits, high8Bits };
  }

  function createDataObject(length) {
    const obj = [];
    for (let i = 0; i < length; i++) {
      obj[i] = 0;
    }
    return obj;
  }

  function fillDataObject(obj, data) {
    for (let i = 0; i < data.length; i++) {
      obj[i] = data[i];
    }

    // Add a checksum at position 62
    let checksum = 0;
    for (let i = 0; i < 62; i++) {
      checksum += obj[i];
    }
    obj[62] = checksum & 0xFF;

    return obj;
  }

  function stringToUint8Array(str) {
    const arr = [];
    for (let i = 0; i < str.length; i++) {
      arr.push(str.charCodeAt(i));
    }
    return arr;
  }

  // 1. Generate the profile information packet
  const profilePacket = createDataObject(63);
  const profileData = [
    1, 0, 29, 0, 0,
    profileInfo.dpi_length,
  ];

  // Add DPI slider list
  for (let i = 0; i < profileInfo.dpi_slider_list.length; i++) {
    const { low8Bits, high8Bits } = splitIntoHighAndLow8Bits(profileInfo.dpi_slider_list[i]);
    profileData.push(low8Bits, high8Bits);
  }

  // Add polling slider
  const { low8Bits: pollingLow, high8Bits: pollingHigh } = splitIntoHighAndLow8Bits(profileInfo.polling_slider);
  profileData.push(pollingLow, pollingHigh);

  // Add battery level, version, lod slider, sports arena
  profileData.push(
    profileInfo.battery_level,
    profileInfo.version & 0xFF, (profileInfo.version >> 8) & 0xFF,
    profileInfo.lod_slider,
    profileInfo.sports_arena
  );

  // Add jitter elimination slider
  const { low8Bits: jitterLow, high8Bits: jitterHigh } = splitIntoHighAndLow8Bits(profileInfo.jitter_elimination_slider);
  profileData.push(jitterLow, jitterHigh);

  // Add hibernation slider (converted to milliseconds)
  const hibernationTime = profileInfo.hibernation_slider * 1000;
  profileData.push(
    hibernationTime & 0xFF,
    (hibernationTime >> 8) & 0xFF,
    (hibernationTime >> 16) & 0xFF,
    (hibernationTime >> 24) & 0xFF
  );

  // Add motion sync and angle
  profileData.push(profileInfo.motion_sync ? 1 : 0, profileInfo.angle_slider || 0);

  // Set active DPI index
  profileData[5 + 2] = profileInfo.dpi_slider_active_index;

  result.push(fillDataObject(profilePacket, profileData));

  // 2. Generate mouse button mapping packet
  const mouseButtonPacket = createDataObject(63);
  const mouseButtonMapping = [
    9, 0, 5,
    0, 0,
    1, 1,
    2, profileInfo.Wheel >= 2000 ? 2 : profileInfo.Wheel,
    3, profileInfo.Back,
    4, profileInfo.Forward,
    5, profileInfo.dpi
  ];

  result.push(fillDataObject(mouseButtonPacket, mouseButtonMapping));

  // 3. Generate macro connections if any exist
  for (let i = 0; i < profileInfo.macroList.length; i++) {
    const macro = profileInfo.macroList[i];
    if (macro.connections && macro.connections.length > 0) {
      for (const connection of macro.connections) {
        const mouseButtons = {
          'Left': 0,
          'Right': 1,
          'Wheel': 2,
          'Back': 3,
          'Forward': 4,
          'dpi': 5
        };

        const macroConnectionPacket = createDataObject(63);
        const macroConnectionData = [
          8, 0, 1,
          connection.cycleMode,
          connection.cycleTimes,
          mouseButtons[connection.keyid],
          i // Macro index
        ];

        result.push(fillDataObject(macroConnectionPacket, macroConnectionData));
      }
    }
  }

  // 4. Generate macro value packets
  for (let i = 0; i < profileInfo.macroList.length; i++) {
    const macro = profileInfo.macroList[i];
    if (macro.value && macro.value.length > 0) {
      const macroValuePacket = createDataObject(63);
      const macroValueData = [26 + i, 0];

      // Calculate how many key events we can include
      const keyEventsData = [];
      for (const keyEvent of macro.value) {
        keyEventsData.push(
          keyEvent.keyCode,
          keyEvent.keyStatus,
          (keyEvent.intervalTime >> 8) & 0xFF,
          keyEvent.intervalTime & 0xFF
        );
      }

      macroValueData.push(Math.floor(keyEventsData.length / 4)); // Number of 4-byte entries
      macroValueData.push(...keyEventsData);

      result.push(fillDataObject(macroValuePacket, macroValueData));
    }
  }

  // 5. Generate macro names
  for (let i = 0; i < profileInfo.macroList.length; i++) {
    const macro = profileInfo.macroList[i];
    if (macro.name) {
      const macroNamePacket = createDataObject(63);
      const nameBytes = stringToUint8Array(macro.name);
      const macroNameData = [
        25, 0, nameBytes.length,
        6 + i, // 6-9 for macros
        ...nameBytes
      ];

      result.push(fillDataObject(macroNamePacket, macroNameData));
    }
  }

  return result;
}
