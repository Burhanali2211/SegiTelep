// Bluetooth types for Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
      getAvailability(): Promise<boolean>;
    };
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer | null;
    addEventListener(event: string, listener: EventListener): void;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    connected: boolean;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    startNotifications(): Promise<void>;
    stopNotifications(): Promise<void>;
    writeValue(data: BufferSource): Promise<void>;
    value?: DataView;
    addEventListener(event: string, listener: EventListener): void;
  }

  interface BluetoothRequestDeviceOptions {
    acceptAllDevices?: boolean;
    filters?: BluetoothDeviceFilters[];
    optionalServices?: BluetoothServiceUUID[];
  }

  interface BluetoothDeviceFilters {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  type BluetoothServiceUUID = string;
  type BluetoothCharacteristicUUID = string;
}

export {};
