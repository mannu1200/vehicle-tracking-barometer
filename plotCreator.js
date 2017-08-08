"use strict";

var
    UTILS = require("./utils"),
    ASYNC = require("async"),
    FS = require("fs"),
    execSync = require('child_process').execSync;

//Hard coded list of transit type for which we want to create the plots
var blacklist = ['Home', 'comp1', 'erc', 'Idle', 'ntu', 'Office', 'Unknown Travel', 'Vehicle', 'Walking', 'waiting for mrt @ TP', 'Waiting', 'at clementi', 'Unknown Place'];

/*
 * Flow:
 *  1. Get the list of sub dirs in output dir
 *  2. For every dir check if ground truth file exists, dont proceed further for
 *       which we dont have the ground truth
 *  3. create a sub dir with transit type name in plotsDir
 *  4. For every file with date format name create a plot
 */

function main(outputDir, plotsDir, cb) {

    //Get list of dirs
    var transitTypes = UTILS.getDirectories(outputDir);
    //Iterate over the dirs
    ASYNC.eachLimit(transitTypes, 1, function(transitType, callback) {
        //Check if transit type os black listed
        if(blacklist.indexOf(transitType) > -1) {
            return callback();
        }
        //Check if ground truth exists for given transit type
        var files = FS.readdirSync(outputDir + transitType);
        if(files.indexOf("groundTruth.txt") == -1) {
            console.log("ground truth file doesn't exists for " + transitType);
            return callback();
        }
        UTILS.createDir(plotsDir + transitType);
        ASYNC.eachLimit(files, 1, function(file, callback2){
            //Check if the file is not ground truth
            if(!UTILS.isDateFormat(file)) {
                return callback2();
            }
            //Create gnu file
            var 
                gtFilePath = outputDir + transitType + "/groundTruth.txt",
                filePath = outputDir + transitType + "/" + file,
                outputFilePath = plotsDir + transitType + "/" + file.split(".")[0] + ".jpeg";
            execSync("java -Xmx500m DtwPlotter \"" + gtFilePath + "\" \"" + filePath + "\" \"" + outputFilePath + "\" 100 10 100 < gnuplot-init.txt > gnuplot-dtw.txt");
            execSync("gnuplot gnuplot-dtw.txt");
            //process.nextTick(callback2);
            setTimeout(callback2, 1);
        }, function(err2){
            callback(err2);
        })

    }, function(err) {
        cb();
    });
}

(function(){
    if(require.main == module) {
        var outputDir = process.argv[2] || "./output/";
        var plotsDir = process.argv[2] || "./plots/";
        main(outputDir, plotsDir, console.log);
    }
}());