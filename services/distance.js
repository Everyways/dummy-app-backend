import haversine from "haversine";

// simple haversine formula
export default function getDistance(origin, destination) {
    const start = {
        latitude: origin.Latitude,
        longitude: origin.Longitude
    }

    const end = {
        latitude: destination.Latitude,
        longitude: destination.Longitude
    } 

    return haversine(start, end, {unit: 'meter'}) / 1000;

}