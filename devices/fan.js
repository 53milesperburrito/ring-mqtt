const debug = require('debug')('ring-mqtt')
const colors = require( 'colors/safe' )
const utils = require( '../lib/utils' )
const AlarmDevice = require('./alarm-device')

class Fan extends AlarmDevice {
    async init(mqttClient) {
        // Home Assistant component type and device class (set appropriate icon)
        this.component = 'fan'

        // Build required MQTT topics for device
        this.deviceTopic = this.alarmTopic+'/'+this.component+'/'+this.deviceId
        this.stateTopic = this.deviceTopic+'/fan_state'
        this.commandTopic = this.deviceTopic+'/fan_command'
        this.speedStateTopic = this.deviceTopic+'/fan_speed_state'
        this.speedCommandTopic = this.deviceTopic+'/fan_speed_command'
        this.attributesTopic = this.deviceTopic+'/attributes'
        this.availabilityTopic = this.deviceTopic+'/status'
        this.configTopic = 'homeassistant/'+this.component+'/'+this.locationId+'/'+this.deviceId+'/config'

        // Publish discovery message for HA and wait 2 seoonds before sending state
        this.publishDiscovery(mqttClient)
        await utils.sleep(2)

        // Publish device state data with optional subscribe
        this.publishSubscribeDevice(mqttClient)
    }

    publishDiscovery(mqttClient) {
        // Build the MQTT discovery message
        const message = {
            name: this.device.name,
            unique_id: this.deviceId,
            availability_topic: this.availabilityTopic,
            payload_available: 'online',
            payload_not_available: 'offline',
            state_topic: this.stateTopic,
            json_attributes_topic: this.attributesTopic,
            command_topic: this.commandTopic,
            speed_state_topic: this.speedStateTopic,
            speed_command_topic: this.speedCommandTopic
        }

        debug('HASS config topic: '+this.configTopic)
        debug(message)
        this.publishMqtt(mqttClient, this.configTopic, JSON.stringify(message))
        mqttClient.subscribe(this.commandTopic)
        mqttClient.subscribe(this.speedCommandTopic)
    }

    publishData(mqttClient) {
        const fanState = this.device.data.on ? "ON" : "OFF"
        const fanSpeed = (this.device.data.level && !isNaN(this.device.data.level) ? 100 * data.level : 0)
        if (0 <= fanSpeedPct && fanSpeedPct <= 33) {
            fanLevel = 'low'
        } else if (34 <= fanSpeedPct && fanSpeedPct <= 66) {
            fanLevel = 'medium'
        } else if (67 <= fanSpeedPct && fanSpeedPct <= 100) {
            fanLevel = 'high'
        } else {
            debug('ERROR - Could not determine fan speed.  Raw value: '+fanSpeed)
            fanLevel = 'unknown'
        }
        // Publish device state
        this.publishMqtt(mqttClient, this.stateTopic, fanState, true)
        this.publishMqtt(mqttClient, this.speedStateTopic, fanLevel, true)
        // Publish device attributes (batterylevel, tamper status)
        this.publishAttributes(mqttClient)
    }
    
    // Process messages from MQTT command topic
    processCommand(message, cmdTopicLevel) {
        if (cmdTopicLevel == 'fan_command') {
            this.setFanState(message)
        } else if (cmdTopicLevel == 'fan_speed_command') {
            this.setFanLevel(message)
        } else {
            debug('Somehow received unknown command topic level '+cmdTopicLevel+' for fan Id: '+this.deviceId)
        }
    }

    // Set fan target state from received MQTT command message
    setFanState(message) {
        debug('Received set fan state '+message+' for fan Id: '+this.deviceId)
        debug('Location Id: '+ this.locationId)

        const command = message.toLowerCase()

        switch(command) {
            case 'on':
            case 'off':
                const on = (command === 'on') ? true : false
                this.device.setInfo({ device: { v1: { on } } })
                break;
            default:
                debug('Received invalid command for fan!')
        }
    }

    // Set fan speed state from received MQTT command message
    setFanLevel(message) {
        level = undefined
        debug('Received set fan level to '+message+' for fan Id: '+this.deviceId)
        debug('Location Id: '+ this.locationId)
        switch(message.toLowerCase()) {
            case 'low':
                level = '0.01'
                break;
            case 'medium':
                level = '0.5'
                break;
            case 'high':
                level = '1'
                break;
            default:
                debug('Speed command received but out of range (low,medium,high)!')
        }
        this.device.setInfo({ device: { v1: { level: level } } })
    }
}

module.exports = Fan
