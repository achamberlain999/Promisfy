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

    async promptForPostcode() {
        let postcode = "NW5 1TL"
        // console.log(postcode)
        return await new Promise((resolve, reject) => {
            readline.question('\nEnter your postcode: ', function() {
                readline.close();
                resolve(postcode);
            });
        });
    }

    displayStopPoints(stopPoints) {
        // console.log("displayStopPoints")
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        // console.log("buildUrl")
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    async makeGetRequest(baseUrl, endpoint, parameters) {
        // console.log("makeGetRequest")
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        return await new Promise((resolve, reject) => {
            // console.log("Promise")
            request.get(url, (err, response, body) => {
                if (err) {
                    reject(err)
                } else if (response.statusCode !== 200) {
                    reject(response.statusCode)
                } else {
                    resolve(body);
                }
            });
        }).catch((error) => {
            console.log(error);
            throw new Error(error);
        });
    }

    async getLocationForPostCode(postcode) {
        // console.log("getLocationForPostCode")
        const responseBody = await this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, [])
        const jsonBody = JSON.parse(responseBody);
        return { latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude };
    }

    async getNearestStopPoints(latitude, longitude, count) {
            // console.log("getNearestStopPoints")
        const responseBody = await this.makeGetRequest(
                TFL_BASE_URL,
                `StopPoint`, 
                [
                    {name: 'stopTypes', value: 'NaptanPublicBusCoachTram'},
                    {name: 'lat', value: latitude},
                    {name: 'lon', value: longitude},
                    {name: 'radius', value: 1000},
                    {name: 'app_id', value: '' /* Enter your app id here */},
                    {name: 'app_key', value: '' /* Enter your app key here */}
                ]);
        const stopPoints = JSON.parse(responseBody).stopPoints.map(function(entity) { 
            return { naptanId: entity.naptanId, commonName: entity.commonName };
        }).slice(0, count);
        return stopPoints;
    }

    async run() {
        // console.log("run")
        const postcode = (await this.promptForPostcode()).replace(/\s/g, '');
        const location = await this.getLocationForPostCode(postcode);
        const stopPoints = await this.getNearestStopPoints(location.latitude, location.longitude, 5);
        this.displayStopPoints(stopPoints);
    }
}