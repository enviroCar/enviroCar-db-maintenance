var pmongo = require('promised-mongo');
var mongo = require('mongodb');
var assert = require('assert');
var ObjectID = mongo.ObjectID;
var DBRef = mongo.DBRef;
var MongoClient = require('mongodb').MongoClient
        , assert = require('assert');
var url = 'mongodb://localhost:27018/enviroCar';
var db = pmongo('localhost:27018/enviroCar');
var tracks = db.collection('tracks');
var measurements = db.collection('measurements');
var users = db.collection('users');
var userstatistic = db.collection('userstatistic');


// codesnippet taken from StackOverflow (link: http://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula  )
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}
;
function deg2rad(deg) {
    return deg * (Math.PI / 180)
}
;
queryTrackMeasurements = function (identifier, i) {
    measurements.find({"track": new DBRef('tracks', new ObjectID(identifier))})
            .sort({"time": 1})
            .then(function (res) {
                var total_dist = 0;
                var coordinates = res[0].geometry.coordinates;
                var last_lat = coordinates[1];
                var last_lng = coordinates[0];
                for (var j = 1; j < res.length; j++) {
                    var coordinates = res[j].geometry.coordinates;
                    var current_lat = coordinates[1];
                    var current_lng = coordinates[0];
                    total_dist +=
                            getDistanceFromLatLonInKm(
                                    last_lat,
                                    last_lng,
                                    current_lat,
                                    current_lng
                                    );
                    last_lat = current_lat;
                    last_lng = current_lng;
                }
                tracks.update(
                        {"_id": new ObjectID(res[0].track.oid)},
                        {$set: {"length": total_dist}}
                );
                console.log("...updated track " + res[0].track.oid + " with length:" + total_dist);
                repeater((i + 1));
                return res;
            });
};
var docs = [];
repeater = function (i) {
    if (i < docs.length) {
        var track = docs[i];
        console.log("updating track: " + track._id + "...");
        queryTrackMeasurements(track._id, i);
    } else {
        console.log("Length retroffing finished.");
    }
};

// retroffing length attribute
tracks.find({length: {$exists: false}})
        .toArray()
        .then(function (response) {
            console.log("Length retroffing startet.");
            docs = response;
            repeater(0);
        });
 