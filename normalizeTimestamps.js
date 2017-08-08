"use strict";

var 
    PARSE = require("csv-parse"),
    FS = require("fs"),
    ASYNC = require("async"),
    UTILS = require("./utils");

function normalizeForAFile(inputFilePath, cb) {
    PARSE(FS.readFileSync(inputFilePath), {comment: '#', delimiter: ','},
        function(err, output) {
            if(err)
                cb(err);
            var gt = output[0][0];
            output.forEach(function(element) {
                element[0] -= gt;
            });
            //Update same file
            UTILS.dumpArrayToFiles(output, inputFilePath);
            cb();
    });
}

function main(outputDir, cb) {
    var transitTypes = UTILS.getDirectories(outputDir);
    ASYNC.eachLimit(transitTypes, 1, function(transitType, callback) {
        ASYNC.eachLimit(FS.readdirSync(outputDir + transitType), 1, function(dateOfTransit, callback2) {
            console.log("Going to process file:", outputDir + transitType + "/" + dateOfTransit);
            normalizeForAFile(outputDir + transitType + "/" + dateOfTransit, callback2);
        }, function(err){
            callback(err);
        })
    }, function(err){
        cb(err);
    });
}

(function(){
    if(require.main == module) {
        main("./output/", console.log);
    }
}());