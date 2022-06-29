// https://github.com/amadeus4dev/amadeus-node

import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import 'dotenv/config';
import request from "request";
import { Buffer } from "buffer";
import * as fs from 'fs';
import * as https from 'https';

// services modules
import Amadeus from 'amadeus';
import getCoordonateFromIataCode from "./services/geocordonates.js";
import getDistance from "./services/distance.js";

// const key = fs.readFileSync('./../localhost+2-key.pem');
// const cert = fs.readFileSync('./../localhost+2.pem');
const app = express();
// const server = https.createServer({key: key, cert: cert }, app);
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_API_KEY,
    clientSecret: process.env.AMADEUS_API_SECRET,
});

app.use(bodyParser.json())
app.use(cors({
    origin: process.env.HTTP_ORIGIN
}));
app.listen(process.env.HTTP_PORT, () =>
    console.log(`Server is running on port: ${process.env.HTTP_HOST}:${process.env.HTTP_PORT}`)
);
// test url
app.get(`/pouet`, (_req, res) => {
    res.send('it works');
});


// Which cities or airports start with the parameter variable
app.get(`/city-and-airport-search/:parameter`, (req, res) => {
    const parameter = req.params.parameter;

    /* A method that returns a list of cities and airports that start with the parameter variable. */
    amadeus.referenceData.locations
        .get({
            keyword: parameter,
            subType: Amadeus.location.airport,
            // subType: Amadeus.location.any,
        })
        .then(function (response) {
            res.send(response.result);
        })
        .catch(function (response) {
            res.send(response);
        });
});

app.get('/reference-data/locations/pois', (_req, res) => {
    //  Force to push some fake data
    // https://github.com/amadeus4dev/data-collection/blob/master/data/pois.md

    // Points of Interest
    // What are the popular places in Barcelona (based a geo location and a radius)
    amadeus.referenceData.locations.pointsOfInterest.get({
        latitude: '40.730824',
        longitude: '-73.997330'
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response)
    })
});

// find tour at destination
app.get(`/tour-activities`, (req, res) => {
    const North = req.query.north;
    const West = req.query.north;
    const South = req.query.south;
    const East = req.query.east;
    amadeus.shopping.activities.bySquare.get({
        north: North,
        west: West,
        south: South,
        east: East
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response);
    });

});
// score safe place
app.get(`/safe-place`, (req, res) => {
    const North = req.query.north;
    const West = req.query.north;
    const South = req.query.south;
    const East = req.query.east;
    amadeus.safety.safetyRatedLocations.bySquare.get({
        north: North, //41.397158,
        west: West, //2.160873,
        south: South, //41.394582,
        east: East, //2.177181
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response);
    });
});

// Find the cheapest flights
app.get(`/flight-footprint`, (req, res) => {
    const originCode = req.query.originCode;
    const destinationCode = req.query.destinationCode;
    const coordonatesDestination = getCoordonateFromIataCode(destinationCode);
    const coordonatesOrigin = getCoordonateFromIataCode(originCode);
    const distance = getDistance(coordonatesOrigin, coordonatesDestination);
    const buff = new Buffer.from(process.env.MY_CLIMATE_API_KEY + ':').toString('base64');

    //https://api.goclimate.com/docs
    const options = {
        method: 'GET',
        url: `https://api.goclimate.com/v1/flight_footprint?cabin_class=economy&origin=${originCode}&destination=${destinationCode}&currencies=EUR`,
        headers: {
            'Authorization': 'Basic ' + buff
        },
        strictSSL: false
    };

    request(options, function (error, response) {
        if (error) throw new Error(error);
        let footprint = JSON.parse(response.body);

        res.send({ distance, footprint });
    });
});

app.get('/air-quality', (req, res) => {
    const destinationCode = req.query.destinationCode;
    const coordonatesDestination = getCoordonateFromIataCode(destinationCode);
    // https://docs.breezometer.com/api-documentation
    const options = {
        method: 'GET',
        url: `https://api.breezometer.com/air-quality/v2/current-conditions?lat=${coordonatesDestination.Latitude}&lon=${coordonatesDestination.Longitude}&key=${process.env.BREEZOMETER_API_KEY}&features=breezometer_aqi,health_recommendations`,
        strictSSL: false
    };

    request(options, function (error, response) {
        if (error) throw new Error(error);
        let airQuality = JSON.parse(response.body);
        res.send(airQuality);
    });

});

// Find the cheapest flights
app.get(`/flight-search`, (req, res) => {
    const originCode = req.query.originCode;
    const destinationCode = req.query.destinationCode;
    const dateOfDeparture = req.query.dateOfDeparture
    amadeus.shopping.flightOffersSearch.get({
        originLocationCode: originCode,
        destinationLocationCode: destinationCode,
        departureDate: dateOfDeparture,
        adults: '1',
        max: '7'
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response);
    });
});

/* A function that is called when the user goes to the url /picture. */
app.get(`/picture`, (_req, res) => {
    amadeus.media.files.generatedPhotos.get({
        category: 'BEACH'
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response)
    })
});

// Confirm availability and price
app.post(`/flight-confirmation`, (req, res) => {
    const flight = req.body.flight
    amadeus.shopping.flightOffers.pricing.post(
        JSON.stringify({
            'data': {
                'type': 'flight-offers-pricing',
                'flightOffers': [flight],
            }
        })
    ).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response)
    })
});

// Book a flight
app.post(`/flight-booking`, (req, res) => {
    const flight = req.body.flight;
    const name = req.body.name
    amadeus.booking.flightOrders.post(
        JSON.stringify({
            'data': [{
                'type': 'flight-order',
                'flightOffers': [flight],
                'travelers': [{
                    "id": "1",
                    "dateOfBirth": "1982-01-16",
                    "name": {
                        "firstName": name.first,
                        "lastName": name.last
                    },
                    "gender": "MALE",
                    "contact": {
                        "emailAddress": "jorge.gonzales833@telefonica.es",
                        "phones": [{
                            "deviceType": "MOBILE",
                            "countryCallingCode": "34",
                            "number": "480080076"
                        }]
                    }
                }],
                "documents": [{
                    "documentType": "PASSPORT",
                    "birthPlace": "Madrid",
                    "issuanceLocation": "Madrid",
                    "issuanceDate": "2015-04-14",
                    "number": "00000000",
                    "expiryDate": "2025-04-14",
                    "issuanceCountry": "ES",
                    "validityCountry": "ES",
                    "nationality": "ES",
                    "holder": true
                }]
            }]
        })
    ).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response);
    });
});
// payment
