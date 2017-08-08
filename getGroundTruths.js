"use strict";

var
    FS = require('fs'),
    ASYNC = require("async"),
    UTILS = require("./utils.js");
/*
    Which day represent the ground truth ?
    Ground truth for any given tansport would be the day for which Loc.txt exist
    for that day and the total time of trasit is minimum.
 */

function getTransitTimeForGivenFile(filePath) {

    var data = FS.readFileSync(filePath);
    if(!data)
        return null;
    var 
        startTime = data.toString().split('\n')[0],
        endTime = data.toString().split('\n')[data.toString().split('\n').length - 1] ||
                     data.toString().split('\n')[data.toString().split('\n').length - 2];
    return endTime.split(',')[0] - startTime.split(',')[0];
}

function checkForLocFile(dateStr, dataFilesPath) {
    return FS.existsSync(dataFilesPath + dateStr + "/Loc.txt");
}

function main(outputDataDir, dataFilesDir, cb) {

    var transitsTypes = UTILS.getDirectories(outputDataDir);

    //For each transit (E.g. Mrt, TP2Clementi)
    ASYNC.eachLimit(transitsTypes, 1, function(transitType, callback1) {
        //And for each date for the given transit type
        console.log("For " + transitType);
        var mintransitTime = 999999999, minTransitTimedate;

        ASYNC.eachLimit(FS.readdirSync(outputDataDir + transitType), 1, function(dateOfTransit, callback2) {
            if(checkForLocFile(dateOfTransit.split(".")[0], dataFilesDir)) {
                var transitTime = getTransitTimeForGivenFile(outputDataDir + transitType + "/" + dateOfTransit);
                if(mintransitTime > transitTime) {
                    minTransitTimedate = dateOfTransit;
                    mintransitTime = transitTime;
                }
            }
            callback2();
        }, function(err){
            console.log("DATE:", minTransitTimedate, " with time: ", mintransitTime/(1000*60));
            //Save the ground truth file in output dirs
            UTILS.cloneFiles(outputDataDir + transitType + "/" + minTransitTimedate, 
                    outputDataDir + transitType + "/groundTruth.txt");
            callback1(err);
        });
    }, function(err2) {
        cb(err2);
    });
}

(function(){
    if(require.main == module) {
        //getTransitTimeForGivenFile("/Users/mannumalhotra/code/nus/vehicle-tracking-barometer/output/mrt, TPtoClementi/2017-6-15.txt");
        
        var 
            outputDir   = process.argv[2] || "./output/",
            dataDir     = process.argv[3] || "./dataFiles/";
        
        main(outputDir, dataDir, console.log);
    }
}());