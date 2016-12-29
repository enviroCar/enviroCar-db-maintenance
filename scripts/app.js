// mongodb script to analyse measurements
var pmongo = require('promised-mongo');
var mongo = require('mongodb');
var assert = require('assert');
var plotly = require('plotly')("MojioMS", "k5vap1mh8k");

var ObjectID = mongo.ObjectID;
var DBRef = mongo.DBRef;
var MongoClient = require('mongodb').MongoClient
        , assert = require('assert');
var url = 'mongodb://localhost:27017/enviroCar';
var db = pmongo('localhost:27017/enviroCar');
var tracks = db.collection('tracks');
var measurements = db.collection('measurements');
var users = db.collection('users');
//var userstatistic = db.collection('userstatistic');

var selectedPhenomOne = "GPS Speed";
var selectedPhenomTwo = "Speed";
/**
 * others are:
 * Consumption
 * 
 */


var x0 = [];
var x1 = [];


var graphOptions = {
    layout: {barmode: "overlay",
    title: "Histogram" },
    filename: "histogramme_big",
    fileopt: "overwrite",
    world_readable: true};

var x = [];

var graphOptions2 = {
    filename: "histogrammResid: " + selectedPhenomOne + " vs " + selectedPhenomTwo + " _big",
    fileopt: "overwrite",
    world_readable: true};

MongoClient.connect(url, function (err, db) {
    db.collection('measurements').aggregate([
        {$match: {
                $and: [
                    {"phenomenons": {"$elemMatch": {"phen._id": selectedPhenomOne}}},
                    {"phenomenons": {"$elemMatch": {"phen._id": selectedPhenomTwo}}}
                ]
            }},
        {
            $project: {
                "one": {
                    $filter: {
                        input: "$phenomenons",
                        as: "phenomenon",
                        cond: {$eq: ["$$phenomenon.phen._id", selectedPhenomOne]}
                    }
                },
                "two": {
                    $filter: {
                        input: "$phenomenons",
                        as: "phenomenon",
                        cond: {$eq: ["$$phenomenon.phen._id", selectedPhenomTwo]}
                    }
                }
            }
        },
        {
            $unwind: "$one"
        },
        {
            $unwind: "$two"
        },
        {
            $project: {
                "diff": {$subtract: ["$one.value", "$two.value"]},
                "one": "$one.value",
                "two": "$two.value"
            }
        }
    ]).toArray(function (err, docs) {
        if (err)
            console.log("error: " + err);
        assert.equal(null, err);
        console.log(docs.length);
        var sumResids = 0;
        for (var index = 0; index < docs.length; index++) {
            sumResids += docs[index].diff;
            x0.push(Math.round(docs[index].one));
            x1.push(Math.round(docs[index].two));
            x.push(docs[index].diff);
            if (index % 1000 === 0){
                console.log(x0[index]);
                console.log(x1[index]);
            }
        }

        // basic transparent overlay histogramms:
        var trace1 = {
            x: x0,
            opacity: 0.75,
            type: "histogram",
            text: selectedPhenomOne+"",
            name: selectedPhenomOne+""
        };
        var trace2 = {
            x: x1,
            opacity: 0.75,
            type: "histogram",
            text: selectedPhenomTwo+"",
            name: selectedPhenomTwo+""
        };
        var data = [trace1, trace2];
        
        console.log("avg resid: " + (sumResids / docs.length));
        
        plotly.plot(data, graphOptions, function (err, msg) {
            console.log(msg);
            console.log(err);
        });

        // basic histogramm GPSSpeed - Speed residuals:
        var data2 = [
            {
                x: x,
                type: "histogram"
            }
        ];
        plotly.plot(data2, graphOptions2, function (err, msg) {
            console.log(msg);
        });

        // Scatter Plot GPSSpeed ~ Speed: too much data!
        var trace3 = {
            x: x0,
            y: x1,
            mode: "markers",
            type: "scatter"
        };

        var data3 = [trace3];
        var layout3 = {
            title: "Scatter Plot BigData",
            xaxis: {
                title: selectedPhenomOne,
                showgrid: false,
                zeroline: false
            },
            yaxis: {
                title: selectedPhenomTwo,
                showline: false
            }
        };
        var graphOptions3 = {
            layout: layout3,
            filename: "Scatterplot "+selectedPhenomOne +" vs "+selectedPhenomTwo+" _big",
            fileopt: "overwrite",
            world_readable: true};
        plotly.plot(data3, graphOptions3, function (err, msg) {
            console.log(msg);
        });

        // boxplot:
        var data4 = [
            {
                y: x,
                boxpoints: "all",
                type: "box",
                name: selectedPhenomOne + " - "+selectedPhenomTwo
            }
        ];
        var layout4 = {
            title: "box plot Residuals "+selectedPhenomOne+" - "+selectedPhenomTwo+" (BigData)",
            yaxis: {
                title: "km/h diff",
                zeroline: true
            }
        };
        var graphOptions4 = {layout: layout4, filename: "boxPlotResids_big", fileopt: "overwrite"};
        plotly.plot(data4, graphOptions4, function (err, msg) {
            console.log(msg);
        });
    });
});
