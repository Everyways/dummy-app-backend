import fs from "fs";
import json from "express";


export default function getCoordonateFromIataCode(iataCode) {
    let rawdata = fs.readFileSync('./sources/iata-airports-geo.json');
    let airport = JSON.parse(rawdata);

    return airport.find((item) => item.iata === iataCode)
    
}
