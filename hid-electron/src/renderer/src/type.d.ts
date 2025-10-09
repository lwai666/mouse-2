
export type DeviceType = {
  path: string,
  vendorId: number,
  productId: number,
  usagePage: number,
  usage: number,
  product: number,
  serialNumber: number,

  // busNumber: number;
  // deviceAddress: number;
  // deviceDescriptor: {
  //   bDescriptorType: number;
  //   bDeviceClass: number;
  //   bDeviceProtocol: number;
  //   bDeviceSubClass: number;
  //   bLength: number;
  //   bMaxPacketSize0: number;
  //   bNumConfigurations: number;
  //   bcdDevice: number;
  //   bcdUSB: number;
  //   iManufacturer: number;
  //   iProduct: number;
  //   iSerialNumber: number;
  //   idProduct: number;
  //   idVendor: number;
  // }
  // portNumbers: number[];
}


export type DeviceNumberType = {
  vendorId: number;
  productId: number;
  getVersionKey: number;
  version: number;
  usbPhyVersion: number;
  usagePage: number;
  usage: number;
  device?: DeviceType;
}
