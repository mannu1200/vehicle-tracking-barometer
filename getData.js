"use strict";


var 
    UTILS = require('./utils.js'),
    parse = require('csv-parse'),
    FS = require('fs'),
    dataMap = {},
    finalMap = {},
    async = require('async'),
    hasPrinted = [];

function dumpArrayToFiles(arr, filePath) {
    var file = FS.createWriteStream(filePath);
    file.on('error', function(err) { /* error handling */ });
    arr.forEach(function(v) { file.write(v + '\n'); });
    file.end();
}

function isDateFormat(dateStr){
    var regex = /201[7,8]-[0,1][0-9]-[0-3][0-9]/;
    if(dateStr && dateStr.match(regex))
        return true;
    return false;
}

function getFileData(filePath, delimiter, cb) {
    //console.log("Going to read file:", filePath);
    if(!FS.existsSync(filePath)) {
        console.log(filePath, " File doesn't exist!!!!!!!!!!");
        return cb(null, []);
    }
    parse(FS.readFileSync(filePath), {comment: '#', delimiter: delimiter || ','},
        function(err, output) {
            return cb(null, output);
    });
}

//GEt YYYY-MM-DD string corresponding to given unix timestamp
function getDate(unixTimeStamp) {
    var date = new Date(parseInt(unixTimeStamp));
    date = date.getFullYear() + '-' + parseInt(date.getMonth() + 1) + '-' + date.getDate();
    //console.log(date, '###################', unixTimeStamp);
    return date;
}

function getVehicle(timeStamp) {
    var date = getDate(timeStamp);
    var arr = dataMap[date];
    if(!arr) {
        if(hasPrinted.indexOf(date) == -1) {
            console.error("MergedData for following date not found: ", date);
            hasPrinted.push(date);
        }
        return null;
    }
    //console.log("@@#@#@#@#@", date, timeStamp, arr);

    //Feeling too lazy to implement binary search 
    //Using Linear for now
    //Let's Keep it for TODO:
    var vehicle = null;
    for(var i = 0; i < arr[0].length; i++) {
        if(arr[0][i] == timeStamp || (arr[0][i] > timeStamp && i > 0)) {
            vehicle = arr[1][i];
            break;
        }
    }
    return vehicle;
}

function processMergedDataFile(dir, cb) {
    var filePath = dir + '/MergedOutput.txt';

    //Get data of the file
    getFileData(filePath, '\t', function(err, fileDataArr) {
        if(err)
            cb(err);

        async.eachLimit(fileDataArr, 1, function(row, callback) {
            var 
                toDate = getDate(row[3]),
                fromDate = getDate(row[4]);

            //In case user forgot to turn off the data collection for some day!
            if(!dataMap[toDate])
                dataMap[toDate] = [[],[]];
            if(!dataMap[fromDate])
                dataMap[fromDate] = [[],[]];
            
            dataMap[toDate][0].push(row[3]);
            dataMap[toDate][0].push(row[4]);
            dataMap[toDate][1].push(row[0]);
            dataMap[toDate][1].push(row[0]);
            return callback(null);

        }, function(err) {
            cb(err);
        });        
    });

}

function processBaroFile(dir, cb) {
    var filePath = dir + '/Baro.txt';

    getFileData(filePath, ',', function(err, fileDataArr) {
        if(err)
            return cb(err);
        console.log("Parsed ", filePath, " # of rows: ", fileDataArr.length);
        var i = 0;
        async.eachLimit(fileDataArr, 1, function(row, callback) {
            i++;

            var 
                date = getDate(row[1]),
                vehicle = getVehicle(row[1]);
            //console.log(i, " date: ", date, " vehicle: ", vehicle);
            
            if(!vehicle) {
                //process.nexttick is For garbage college, 
                //async's recursive calls fucks up the stack!
                if(i%500 == 0)
                    return process.nextTick(callback);
                else
                    return callback();
            }
            
            if(!finalMap[vehicle])
                finalMap[vehicle] = {};
            if(!finalMap[vehicle][date])
                finalMap[vehicle][date] = [];
            
            finalMap[vehicle][date].push( row[1].toString() + "," + row[3].toString());
            //console.log(finalMap, "BOOOOOOOOOOOOOOOOOOM");
            if(i%500 == 0)
                    return process.nextTick(callback);
                else
                    return callback();
        }, cb);
    });
}

//Parse finalMap and save it to outputDir creating the desired dir structure
function saveTheData(outPutDir) {
    //Create the dirs
    Object.keys(finalMap).forEach(function(vehicleKey) {
        UTILS.createDir(outPutDir + vehicleKey);
        Object.keys(finalMap[vehicleKey]).forEach(function(dateKey){
            //createDir(outPutDir + vehicleKey + '/' + dateKey);
            dumpArrayToFiles(finalMap[vehicleKey][dateKey], 
                outPutDir + vehicleKey + '/' + dateKey + '.txt' );
        });
    });
}

function main(filesDir, cb) {
    //Get all the sub dir in the given dir (Sub dir shld be of format YYYY-MM-DD)
    var subDirs = UTILS.getDirectories(filesDir);
    async.each(subDirs, function(subDir, done) {
        if(!isDateFormat(subDir)) {
            //Some garbage dir, continue the loop
            console.log(subDir, " should not be there in ", filesDir, " dir");
            return done();
        }
        //process Merged files
        processMergedDataFile(filesDir  + subDir, done);
    }, function(err) {
        if(err)
            return cb(err);

        console.log("Starting the processing on Baro files:");
        async.eachLimit(subDirs, 1, function(subDir, done) {
            if(!isDateFormat(subDir)) {
                //Some garbage dir, continue the loop
                console.log(subDir, " should not be there in ", filesDir, " dir");
                return done();
            }
            //process Merged files
            processBaroFile(filesDir  + subDir, done);
        }, function(err) {
            saveTheData('/Users/mannumalhotra/code/nus/vehicle-tracking-barometer/output/');
            cb(err);
        });

    });

}

(function() {
    if (require.main == module) {
        var 
            dataDir = '/Users/mannumalhotra/code/nus/vehicle-tracking-barometer/archived-data/dataFiles/',
            firDir = dataDir + '2017-06-01/MergedOutput-2.txt';
        //console.log(isDateFormat('2017-05-31'));
        //getFileData(fileDir, console.log);
        //console.log(getDate(1496314965958));
        main(dataDir, function(err){
            console.log(err, dataMap['2017-6-1']);
            Object.keys(finalMap).forEach(function(key) {
                console.log("You travelled in ", key, " On following days: ");
                Object.keys(finalMap[key]).forEach(function(key_){
                    console.log(key_);
                }); 
            });
        });
    }
}());