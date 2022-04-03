import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { Bonjour } from 'bonjour-service';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ExerciseLightAccessory } from './platformAccessory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class ExerciseLightsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.info('Initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      const bonjour = new Bonjour();
      bonjour.find({ type: 'http' }, service => this.handleServiceDiscovered(service));
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  /**
   * Handles an mDNS device discovery response and properly registers
   * exercise lights with Homebridge
   *
   * @param response The mDNS query response
   */
  handleServiceDiscovered(response: any): void {
    if (response.name !== 'exercise-lights') {
      return;
    }

    const ipAddress: string = response.referer.address;
    const uuid = this.api.hap.uuid.generate(`${response.fqdn}@${ipAddress}`);
    const existingLight = this.accessories.find(light => light.UUID === uuid);
    if (existingLight) {
      this.log.info(`Found existing exercise light accessory: ${ipAddress}`);
      new ExerciseLightAccessory(this, existingLight, ipAddress);
    } else {
      this.log.info(`Registering new exercise light accessory: ${ipAddress}`);
      const accessory = new this.api.platformAccessory('Exercise Lights', uuid);
      accessory.context.device = { fqdn: response.fqdn, ipAddress };
      new ExerciseLightAccessory(this, accessory, ipAddress);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ accessory ]);
    }
  }
}
