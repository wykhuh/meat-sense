var request = require("request");


//=========================================
// buzzer -

var upmBuzzer = require("jsupm_buzzer"); // Initialize on GPIO 5
var myBuzzer = new upmBuzzer.Buzzer(5);

// Print sensor name
console.log('buzzer', myBuzzer.name());



//=========================================
// ir temp

// analog voltage, usually 3.3 or 5.0
var OTP538U_AREF = 5.0;

var tempIRSensor_lib = require('jsupm_otp538u');

// Instantiate a OTP538U on analog pins A0 and A1
// A0 is used for the Ambient Temperature and A1 is used for the
// Object temperature.
var tempIRSensor_obj = new tempIRSensor_lib.OTP538U(0, 1, OTP538U_AREF);
var ambient, object;

function checkTemp() {
  ambient = roundNum(tempIRSensor_obj.ambientTemperature(), 0);
  object = roundNum(tempIRSensor_obj.objectTemperature(), 0);
  console.log('temps', ambient, object)
}

function roundNum(num, decimalPlaces) {
  var extraNum = (1 / (Math.pow(10, decimalPlaces) * 1000));
  return (Math.round((num + extraNum) *
    (Math.pow(10, decimalPlaces))) / Math.pow(10, decimalPlaces));
}

console.log('ir temp');



//=========================================
// Flame Sensor

var flameSensor = require('jsupm_yg1006');
// Instantiate a flame sensor on digital pin D2
var myFlameSensor = new flameSensor.YG1006(2);

console.log('flame');

//=========================================
// air quality

var upmTP401 = require('jsupm_gas');
//setup sensor on Analog pin #0
var airSensor = new upmTP401.TP401(2);
var air_value, ppm;

function getAirQuality() {
  air_value = airSensor.getSample();
  ppm = airSensor.getPPM();
}

//warm up sensor
console.log("Sensor is warming up for 3 minutes..");

//start loop in 3 minutes
setTimeout(function() {
  console.log("air quality Sensor is ready!");
  getAirQuality();
}, 180000);

console.log('airQuality');

//=========================================
// lcd

// Load lcd module on I2C
var LCD = require('jsupm_i2clcd');

// Initialize Jhd1313m1 at 0x62 (RGB_ADDRESS) and 0x3E (LCD_ADDRESS)
var myLcd = new LCD.Jhd1313m1(0, 0x3E, 0x62);

myLcd.setCursor(0, 0);

console.log('lcd');

//======================================
// collect data

function recordData() {
  var airHazardPresent, flameHazardPresent, isAlarmOn;

  // ir temp
  checkTemp();

  // air quality
  getAirQuality();

  // flame or air quality
  if (myFlameSensor.flameDetected() || air_value > 200) {
    console.log("Flame detected.", air_value);

    // play sound 3 second
    myBuzzer.playSound(upmBuzzer.DO, 3 * 1000000);
    myBuzzer.stopSound();

    airHazardPresent = true;
    flameHazardPresent = true;
    isAlarmOn = true;

  } else {
    console.log("No flame detected.", air_value);
    myBuzzer.stopSound();
    airHazardPresent = false;
    flameHazardPresent = false;
    isAlarmOn = false;
  }


  var options = {
    url: 'http://xxx/api/sensors',
    body: {
      airHazardPresent: airHazardPresent,
      flameHazardPresent: flameHazardPresent,
      isAlarmOn: isAlarmOn,
      temp: {
        ambient: ambient,
        object: object
      }
    },
    json: true,
    method: 'post'
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('good api');
    } else {
      console.log('bad api', response.statusCode);
    }
  }

  request(options, callback);

}

var myInterval = setInterval(recordData, 3000);

process.on('SIGINT', function() {
  clearInterval(myInterval);

  console.log("Exiting...");
  process.exit(0);
});
