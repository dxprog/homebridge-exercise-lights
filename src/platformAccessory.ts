import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { get as httpGet } from 'got';

import { ExerciseLightsPlatform } from './platform';

const DEBOUNCE_TIMEOUT = 250;
const MAX_BRIGHTNESS = 150;
const MAX_SATURATION = 255;
const MAX_HUE = 255;

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExerciseLightAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private state = {
    On: false,
    Brightness: 100,
    Hue: 192,
    Saturation: 100,
    Speed: 0,
    Cadence: 0,
  };

  private debounceTimer: NodeJS.Timeout | undefined;

  constructor(
    private readonly platform: ExerciseLightsPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly ipAddress: string,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Hakk')
      .setCharacteristic(this.platform.Characteristic.Model, 'Exercise Lights')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'X0001');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Exercise Lights');

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(() => this.state.On);               // GET - bind to the `getOn` method below

    // color related things
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(() => this.state.Brightness);

    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(() => this.state.Hue);

    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(() => this.state.Saturation);
  }

  flushState() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (!this.state.On) {
        httpGet(`http://${this.ipAddress}/hsv/0/0/0`);
        return;
      }

      const hue = Math.floor(this.state.Hue / 359 * MAX_HUE);
      const brightness = Math.floor(this.state.Brightness / 100 * MAX_BRIGHTNESS);
      const saturation = Math.floor(this.state.Saturation / 100 * MAX_SATURATION);
      this.platform.log.info(`Setting exercise lights HSV: /hsv/${hue}/${saturation}/${brightness}`);
      httpGet(`http://${this.ipAddress}/hsv/${hue}/${saturation}/${brightness}`);
    }, DEBOUNCE_TIMEOUT);
  }

  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.state.On = value as boolean;
    this.flushState();
  }

  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.state.Brightness = value as number;
    this.state.On = this.state.Brightness > 0;
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    this.flushState();
  }

  async setHue(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.state.Hue = value as number;
    this.platform.log.info('Set Characteristic Hue -> ', value);
    this.flushState();
  }

  async setSaturation(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.state.Brightness = value as number;
    this.platform.log.info('Set Characteristic Saturation -> ', value);
    this.flushState();
  }

}
