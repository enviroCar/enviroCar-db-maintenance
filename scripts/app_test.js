var request = require('request');
var track_delete_urls = [];
var track_ids = [];
var count_created = 0;
// Set the headers
var headers = {
    'X-User': 'staschc',
    'X-Token': 'finchen',
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/JSON'
};
// Set the headers
var headers_post = {
    'X-User': 'dewall',
    'X-Token': 'hallohallo',
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/JSON'
};
var headers_delete = {
    'X-User': 'dewall',
    'X-Token': 'hallohallo',
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/JSON'
};
// Configure the request
var options = {
    url: 'https://enviroCar.org/api/stable/users/staschc/tracks?limit=1000',
    method: 'GET',
    headers: headers
};

var next = function (docs, curr, end) {
    if (curr === end) {

    } else {
        var track_curr = docs["tracks"][curr];
        // get the track:
        var options_getTrack = {
            url: 'https://enviroCar.org/api/stable/users/staschc/tracks/' + track_curr["id"],
            method: 'GET',
            headers: headers
        };
        request(options_getTrack, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                console.log("#" + curr + "  _id:" + track_curr["_id"]);
                    // Print out the response body
                    // get the result into new json track for post cmd:
                    var json_track = {
                        "properties": {
                            "sensor": "57c556d1e4b0f05fc1bf619a",
                            "name": "testrack ",
                            "description": "Lorem ipsum..."
                        },
                        "features": []
                    };
                    var item = JSON.parse(body);
                    var features = item.features;
                    for (var i = 0; i < features.length; i++) {
                        var track_i = {
                            "type": "Feature",
                            "properties": {
                                "time": features[i].properties.time,
                                "phenomenons": {
                                },
                                "sensor": "57c556d1e4b0f05fc1bf619a"
                            },
                            "geometry": features[i].geometry
                        };
                        json_track.features.push(track_i);
                        // add speed value if not NaN:
                        if (features[i].properties.phenomenons["Speed"]) {
                            track_i.properties.phenomenons = {
                                "Speed": {
                                    "value": features[i].properties.phenomenons["Speed"].value
                                }
                            };
                        }
                    }
                    // Configure the request
                    var options_post = {
                        url: 'http://localhost:8080/webapp/users/dewall/tracks',
                        method: 'POST',
                        json: true,
                        headers: headers_post,
                        body: json_track
                    };
                    // Start the request
                    request(options_post, function (error2, response2, body2) {
                        if (!error2) {
                            // Print out the response body
                            console.log("FINE");
                            // parse track ID of created track:
                            var caseless = response2.caseless;
                            var location = caseless.dict.location;
                            console.log(location);
                            track_delete_urls.push(location);
                            count_created++;
//                    if (count_created === 20) {
//                        var seconds = 20;
//                        console.log("TWENTY TRACKS HAVE BEEN POSTED.");
//                        console.log("STARTING DELETE IN " + seconds + " SECONDS.");
//                        setTimeout(function () {
//                            delete_em_all();
//                        }, (seconds * 1000));
//                    }
                            console.log("track #" + count_created + " added.");
                            ;
                        } else {
                            console.log("ERROR");
                        }
                    });

                
                setTimeout(function () {
                    var indexNext = curr + 1;
                    next(docs, indexNext, end);
                }, 500);

            } else {
                console.log("#" + curr + "  _id:" + track_curr["_id"]);
                console.log(error);
                setTimeout(function () {
                    var indexNext = curr + 1;
                    next(docs, indexNext, end);
                }, 1000);
            }
        });
    }
};

// Start the request
request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
        var json = JSON.parse(body);
        var n_tracks = json["tracks"].length;
        next(json, 0, n_tracks);
    }
    ;
});

var delete_em_all = function () {

    for (var i = 0; i < 20; i++) {
// Configure the DELETE request
        var options_post = {
            url: track_delete_urls[i],
            method: 'DELETE',
            headers: headers_delete
        };
        //Start the request
        request(options_post, function (error, response, body) {
            if (!error) {
                console.log("DELETED");
                console.log(response.statusCode);
            } else {
                console.log("ERROR(DELETE)");
            }
            ;
        });
    }
}
;