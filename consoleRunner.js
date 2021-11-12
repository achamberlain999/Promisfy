import { createInterface } from 'readline';
import { URL } from 'url';
import request from 'request';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {

    promptForPostcode(callback) {
        let postcode = "NW5 1TL"
        console.log(postcode)
        callback(postcode)
        return
        readline.question('\nEnter your postcode: ', function(postcode) {
            readline.close();
            callback(postcode);
        });
    }

    displayStopPoints(stopPoints) {
        console.log("displayStopPoints")
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        console.log("buildUrl")
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    makeGetRequest(baseUrl, endpoint, parameters) {
        console.log("makeGetRequest")
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        return new Promise((resolve, reject) => {
            console.log("Promise")
            request.get(url, (err, response, body) => {
                if (err) {
                    reject(err)
                } else if (response.statusCode !== 200) {
                    reject(response.statusCode)
                } else {
                    resolve(body);
                }
            });
        }).catch((error) => console.log(error))
    }

    getLocationForPostCode(postcode, callback) {
        console.log("getLocationForPostCode")
        this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, []).then(
            function(responseBody) {
                const jsonBody = JSON.parse(responseBody);
                callback({ latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude });
            }
        )
    }

    getNearestStopPoints(latitude, longitude, count, callback) {
        console.log("getNearestStopPoints")
        this.makeGetRequest(
            TFL_BASE_URL,
            `StopPoint`, 
            [
                {name: 'stopTypes', value: 'NaptanPublicBusCoachTram'},
                {name: 'lat', value: latitude},
                {name: 'lon', value: longitude},
                {name: 'radius', value: 1000},
                {name: 'app_id', value: '' /* Enter your app id here */},
                {name: 'app_key', value: '' /* Enter your app key here */}
            ]).then(
                function(responseBody) {
                    const stopPoints = JSON.parse(responseBody).stopPoints.map(function(entity) { 
                        return { naptanId: entity.naptanId, commonName: entity.commonName };
                    }).slice(0, count);
                    callback(stopPoints);
                }
            ).catch(() => console.log('oh noh'))
    }

    run() {
        console.log("run")
        const that = this;
        that.promptForPostcode(function(postcode) {
            postcode = postcode.replace(/\s/g, '');
            that.getLocationForPostCode(postcode, function(location) {
                that.getNearestStopPoints(location.latitude, location.longitude, 5, function(stopPoints) {
                    that.displayStopPoints(stopPoints);
                });
            });
        });
    }
}