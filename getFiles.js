"use strict";

var 
    FS = require('fs'),
    PATH = require('path'),
    UTILS = require('./utils');

function getMergedOutputfileName(dir) {
    var list = [];
    FS.readdirSync(dir).forEach(file => {
        if(file.indexOf('MergedOutput') != -1)
            list.push(file);
    });
    //Get MergedOutput-n from the list
    var 
        regex = /\d+/,
        largestNumber = 0,
        result = null;
    
    list.forEach(function(file){
        var currentNumber = file.match(regex);
        //console.log(currentNumber, file);
        if(currentNumber && currentNumber[0] > largestNumber) {
            largestNumber = currentNumber[0];
            result = file;
        } else if(file == 'MergedOutput.txt') {
            largestNumber = 0,
            result = 'MergedOutput.txt';
        }
    });
    return result;
}

function main(dirPath, destPath, files) {
    
    var parentDirs = UTILS.getDirectories(dirPath);
    parentDirs.forEach(function(dateDir) {
        UTILS.createDir(destPath + dateDir);
        //Copy the data files
        files.forEach(function(dataFile) {
            console.log("Calling clone files:" + dirPath + dateDir + '/' + dataFile);
            UTILS.cloneFiles(dirPath + dateDir + '/' + dataFile, destPath + dateDir + '/' + dataFile);
        });
        //Copy MergedData file
        var fileName = getMergedOutputfileName(dirPath + dateDir);
        //console.log("File name:", fileName, ' for date: ', dateDir);

        //No matter what value of n is in Mergeddata-n, we are only going to 
        //save file as mergeData.txt
        if(fileName)
            UTILS.cloneFiles(dirPath + dateDir + '/' + fileName, destPath + dateDir + '/MergedOutput.txt');
    });
}

(function() {
    if (require.main == module) {
        var
            dir = process.argv[2] || '/Volumes/Untitled/New\ folder/TravelDiaryApp/',
            destinationDir = 'dataFiles/',
            files = ['Baro.txt', 'Loc.txt'];
            
        main(dir, destinationDir, files);
       //console.log(getMergedOutputfileName(dir + '2017-06-01/'));
    }
}());