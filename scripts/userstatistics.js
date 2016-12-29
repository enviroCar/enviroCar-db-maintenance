/**
 * This node.js script calculates and creates the userstatistics for each user
 * @type Module promised-mongo|Module promised-mongo
 */
var pmongo = require('promised-mongo');
var mongo = require('mongodb');
var assert = require('assert');
var ObjectID = mongo.ObjectID;
var DBRef = mongo.DBRef;
var MongoClient = require('mongodb').MongoClient
        , assert = require('assert');
var url = 'mongodb://localhost:27017/enviroCar';
var db = pmongo('localhost:27017/enviroCar');
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

/**
 * @param {type} json
 * @returns {undefined} value of phenomenon "Speed" of a measurement
 */
getSpeedValue = function (json) {
    if ((!json) || (!json.length))
        return undefined;
    for (var index = 0; index < json.length; index++) {
        var current = json[index];
        if (current)
            if (current.phen)
                if (current.phen._id === "Speed")
                    return current.value;
    }
    return undefined;
};

/**
 * @param {type} json
 * @returns {undefined} "modified" timestamp of the "Speed" phenomenon of a measurement
 */
getSpeedTimeStamp = function (json) {
    if ((!json) || (!json.length))
        return undefined;
    for (var index = 0; index < json.length; index++) {
        var current = json[index];
        if (current)
            if (current.phen)
                if (current.phen._id === "Speed")
                    if (current.phen.modified)
                        return current.phen.modified;
    }
    return undefined;
};

/**
 * @param {type} json
 * @returns {undefined} "time" timestamp of a measurement
 */
getTimeStamp = function (json) {
    if (!json)
        return undefined;
    if (json["time"])
        return json["time"];
    return undefined;
};

// query all measurements of a certain track:
queryTrackSummaryMeasurements = function (trackID, k, i, username) {
    measurements.find({"track": new DBRef('tracks', new ObjectID(trackID))})
            .sort({"time": 1})
            .then(function (res) {
                var coordinates = res[0].geometry.coordinates;
                var last_lat = coordinates[1];
                var last_lng = coordinates[0];
                var currentSpeed = 0;
                var currentSpeedAvg = 0;
                var lastSpeed = undefined;
                if (getSpeedValue(res[0].phenomenons))
                    lastSpeed = getSpeedValue(res[0].phenomenons);
                var currentTime = undefined;
                var lastTime = undefined;
                if (getTimeStamp(res[0]))
                    lastTime = getTimeStamp(res[0]);
                var currentDura = 0;

                for (var j = 1; j < res.length; j++) {
                    // calculate dist:
                    var coordinates = res[j].geometry.coordinates;
                    var current_lat = coordinates[1];
                    var current_lng = coordinates[0];
                    var current_dist = getDistanceFromLatLonInKm(
                            last_lat,
                            last_lng,
                            current_lat,
                            current_lng
                            );
                    total_dist += current_dist;
                    m_dist++;

                    // calculate time diff (if timestamp is accessible):
                    if (getTimeStamp(res[j])) {
                        currentTime = getTimeStamp(res[j]);
                        if (lastTime) {
                            currentDura = new Date(currentTime).getTime() - new Date(lastTime).getTime();
                            total_dura += currentDura;
                            m_dura++;
                            if (currentDura<0) {
                                console.log("current: " + currentTime + ", last: " + lastTime);
                                console.log("timeDiff (s): " + currentDura);
                            }
                        }
                        lastTime = currentTime;
                    } else {
                        lastTime = undefined;
                    }

                    // get SpeedValue and sum up matching interval values:
                    if (getSpeedValue(res[j].phenomenons)) {
                        currentSpeed = getSpeedValue(res[j].phenomenons);
                        if (lastSpeed) {
                            // matchings und zuweisungen
                            if (lastSpeed < 60) {
                                total_dist_below60kmhFWD += current_dist;
                                total_dura_below60kmhFWD += currentDura;
                            } else if (lastSpeed > 130) {
                                total_dist_above130kmhFWD += current_dist;
                                total_dura_above130kmhFWD += currentDura;
                            }
                            currentSpeedAvg = (currentSpeed + lastSpeed) / 2;
                            if (currentSpeedAvg < 60) {
                                total_dist_below60kmhAVG += current_dist;
                                total_dura_below60kmhAVG += currentDura;
                            } else if (currentSpeedAvg > 130) {
                                total_dist_above130kmhAVG += current_dist;
                                total_dura_above130kmhAVG += currentDura;
                            }
                        } else {
                            // Speed is undefined:
                            total_dist_NaN += current_dist;
                            total_dura_NaN += currentDura;
                        }
                        lastSpeed = currentSpeed;
                    } else {
                        lastSpeed = undefined;
                    }
                    last_lat = current_lat;
                    last_lng = current_lng;
                }

                startPositionLat = res[0].geometry.coordinates[1];
                startPositionLng = res[0].geometry.coordinates[0];
                endPositionLat = res[res.length - 1].geometry.coordinates[1];
                endPositionLng = res[res.length - 1].geometry.coordinates[0];
                id = trackID.toString();
                console.log("updated userstatistics after track: " + trackID + ":");
                var jsonresult = {
                    "trackSummaries": trackSummaries,
                    "distance": total_dist,
                    "duration": total_dura,
                    "<60:": {
                        "distanceFWD": total_dist_below60kmhFWD,
                        "distanceAVG": total_dist_below60kmhAVG,
                        "durationFWD": total_dura_below60kmhFWD,
                        "durationAVG": total_dura_below60kmhAVG
                    },
                    ">130:": {
                        "distanceFWD": total_dist_above130kmhFWD,
                        "distanceAVG": total_dist_above130kmhAVG,
                        "durationFWD": total_dura_above130kmhFWD,
                        "durationAVG": total_dura_above130kmhAVG
                    },
                    "NaN:": {
                        "distance": total_dist_NaN,
                        "duration": total_dura_NaN
                    }
                };
                console.log(jsonresult);
                // repeat for next track:
                repeater_tracks(i, (k + 1), username);
                return res;
            });
};

var tracksdocs = [];
repeater_tracks = function (i, k, userid) {
    if (k < tracksdocs.length) {
        var track = tracksdocs[k];
        console.log("updating trackSummary for track: " + track._id + "...");
        // query all measurements of current track:
        queryTrackSummaryMeasurements(track._id, k, i, userid);
        var trackSummary = {
            "id": id,
            "startPositionLat": startPositionLat,
            "startPositionLng": startPositionLng,
            "endPositionLat": endPositionLat,
            "endPositionLng": endPositionLng,
        };
        trackSummaries.push(trackSummary);
    } else {
        console.log("...user " + userid + " finished.");

        // create userstatistic for this current user and save it into DB:
        // from milliseconds to hours:
        total_dura /= 60 * 60 * 1000;
        total_dura_below60kmhFWD /= 60 * 60 * 1000;
        total_dura_above130kmhFWD /= 60 * 60 * 1000;
        total_dura_NaN /= 60 * 60 * 1000;

        userstatistic.insert(
                {
                    "user": new DBRef("users", userid),
                    "distance": total_dist,
                    "duration": total_dura,
                    "distanceBelow60kmh": total_dist_below60kmhFWD,
                    "durationBelow60kmh": total_dura_below60kmhFWD,
                    "distanceAbove130kmh": total_dist_above130kmhFWD,
                    "durationAbove130kmh": total_dura_above130kmhFWD,
                    "distanceNaN": total_dist_NaN,
                    "durationNaN": total_dura_NaN,
                    "trackSummaries": trackSummaries
                }
        );

        // reset tracksummarystats to 0:
        total_dist = 0;
        total_dura = 0;
        total_dist_below60kmhAVG = 0;
        total_dist_above130kmhAVG = 0;
        total_dura_below60kmhAVG = 0;
        total_dura_above130kmhAVG = 0;
        total_dist_below60kmhFWD = 0;
        total_dist_above130kmhFWD = 0;
        total_dura_below60kmhFWD = 0;
        total_dura_above130kmhFWD = 0;
        total_dist_NaN = 0;
        total_dura_NaN = 0;
        trackSummaries = [];
        // repeat for next user;
        repeater_users((i + 1));
    }
};
var total_dist = 0;
var total_dura = 0;
var total_dist_below60kmhAVG = 0;
var total_dist_above130kmhAVG = 0;
var total_dura_below60kmhAVG = 0;
var total_dura_above130kmhAVG = 0;
var total_dist_below60kmhFWD = 0;
var total_dist_above130kmhFWD = 0;
var total_dura_below60kmhFWD = 0;
var total_dura_above130kmhFWD = 0;
var total_dist_NaN = 0;
var total_dura_NaN = 0;

var m_dist = 0;
var m_dura = 0;

var trackSummaries = [];
// queries all tracks of a certain user._id = identifier
queryTrack = function (identifier, i) {
    // query all tracks of a certain user:
    tracks.find({"user": new DBRef('users', identifier)})
            .toArray()
            .then(function (res) {
                // reset tracksummarystats to 0:
                total_dist = 0;
                total_dura = 0;
                total_dist_below60kmhAVG = 0;
                total_dist_above130kmhAVG = 0;
                total_dura_below60kmhAVG = 0;
                total_dura_above130kmhAVG = 0;
                total_dist_below60kmhFWD = 0;
                total_dist_above130kmhFWD = 0;
                total_dura_below60kmhFWD = 0;
                total_dura_above130kmhFWD = 0;
                total_dist_NaN = 0;
                total_dura_NaN = 0;
                trackSummaries = [];
                tracksdocs = res;
                // loop over each track:
                repeater_tracks(i, 0, identifier);
                return res;
            });
};
var usersdocs = [];
// loops over each user:
repeater_users = function (i) {
    if (i < usersdocs.length) {
        var user = usersdocs[i];
        console.log("updating userstatistics for user: " + user._id + "...");
        // query all tracks of current user:
        queryTrack(user._id, i);
    } else {
        console.log("mDist: " + m_dist + " , mDura: " + m_dura);
        console.log("UserStatistics retroffing finished.");
    }
};

// retroffing UserStatistics:
users.find({})
        .toArray()
        .then(function (response) {
            console.log("UserStatistics retroffing startet.");
            usersdocs = response;
            // loop over each user:
            repeater_users(0);
        });